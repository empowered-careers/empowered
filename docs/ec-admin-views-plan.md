# Admin Views — Super Admin + Agency Portal (Plan)

> Last updated: 2026-05-20
> Status: Plan approved, not yet implemented
> Related: `docs/ec-job-board-plan.md` (must coordinate — see Sequencing)

## Context

The platform today has no admin surface. Lauren manages everything via Supabase Studio + Google Sheets (per `docs/ec-admin-operations.md`). Two admin surfaces are needed:

1. **Super admin** (Lauren + team) — full visibility over jobs, candidates, applications, payments, placements, commissions, enrollments. Phase 1 priority; replaces ad-hoc SQL work.
2. **Agency / company portal** — a logged-in employer or agency partner can submit and track their own roles and see candidates who expressed interest. Phase 2 per `ec-admin-operations.md`, but planned now so the role/data model lands once.

A separate, recently-approved plan (`docs/ec-job-board-plan.md`) chose `profiles.is_admin boolean` as the super-admin marker and stubbed `/admin/jobs` + `src/app/admin/layout.tsx`. That plan is not yet implemented. **This plan supersedes the `is_admin` boolean** in favor of a role enum + employer scoping, so we don't ship the boolean and immediately migrate away from it. Coordinate the job-board migration with the role migration below — land the role enum first, then the job-board RLS references it.

User decisions captured up front (so future revisions can find them):

- **Role model**: `profiles.role` enum (`candidate` | `admin` | `employer`) + `profiles.employer_id` FK. Replaces `is_admin`.
- **Agency scope**: an employer user sees their own jobs + **full candidate PII on expressions of interest** (not the PII-gated Phase 2 spec in `ec-admin-operations.md`). Update that doc to match.
- **Build scope**: plan both surfaces in detail; decide what to actually implement after reading this plan.

---

## Role + auth model

### Migration `<ts>_role_enum.sql`

```sql
create type user_role as enum ('candidate', 'admin', 'employer');

alter table profiles
  add column role user_role not null default 'candidate',
  add column employer_id uuid references employers(id) on delete set null;

-- backfill: any pre-existing rows are candidates by default; Lauren's row promoted manually
create index profiles_role_idx on profiles(role);
create index profiles_employer_id_idx on profiles(employer_id) where employer_id is not null;

-- helper used by every admin/employer RLS policy
create or replace function is_admin() returns boolean
  language sql stable security definer as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function is_employer() returns boolean
  language sql stable security definer as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'employer');
$$;

create or replace function current_employer_id() returns uuid
  language sql stable security definer as $$
  select employer_id from profiles where id = auth.uid();
$$;
```

### Migration `<ts>_replace_is_admin_in_rls.sql` (only if `is_admin` boolean shipped first)

If the job-board plan already merged with `profiles.is_admin`, this migration rewrites those policies to use `is_admin()` function and drops the column. Otherwise: collapse into the role-enum migration and there's no boolean to remove.

### Auth guard pattern

Mirror the existing `src/app/(app)/layout.tsx` server-side check (lines 25–33). Two new layout guards:

- `src/app/admin/layout.tsx` — `select role from profiles where id = user.id`; if `!== 'admin'` → `redirect('/dashboard')`. Renders an admin shell (sidebar with admin nav).
- `src/app/employer/layout.tsx` — same shape, but allow `role in ('admin','employer')` so Lauren can impersonate-view by visiting employer routes. Fetch `employer_id` and pass to client via context. If `employer` role with null `employer_id` → redirect to a "your account isn't linked to a company yet" page.

---

## Super admin surface (`/admin/*`)

Routes (server components fetch + pass `initialData` to client per the project's Server/Client split pattern):

| Route                      | Purpose                                                                                                                              | Notes                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `/admin`                   | Overview tiles: active candidates (free vs paid), open roles by tier, applications by status, placements MTD, commission outstanding | Aggregations only; no row-level fetches                                                                                        |
| `/admin/jobs`              | List + create Tier 1/2/3 jobs                                                                                                        | Already drafted in job-board plan; keep route, swap `is_admin` boolean check for `role = 'admin'`                              |
| `/admin/jobs/[id]/edit`    | Edit, archive, mark filled, change tier                                                                                              | Same                                                                                                                           |
| `/admin/candidates`        | Candidate pool: filterable table                                                                                                     | Filters: plan, completeness score (computed), role-clarity score, assessment count, signup date. Per `ec-admin-operations.md`  |
| `/admin/candidates/[id]`   | One candidate's full profile: resume + LinkedIn + assessments + match scores + applications + payments + notes                       | Internal notes field (textarea, writes to `profiles.internal_notes` — new column)                                              |
| `/admin/applications`      | Pipeline kanban across **all** candidates (Lauren's view, the S6 deliverable)                                                        | Drag a card to change `application_status`; writes go through `updateApplicationStatus` server action with role check          |
| `/admin/applications/[id]` | Single application detail: candidate + job + status log + notes + mark-as-placed CTA                                                 | "Mark as placed" creates a `placements` row, optionally a `commissions` row if `employer.relationship_type = 'agency_partner'` |
| `/admin/placements`        | Placement table, mark guarantee period, finalize, refund                                                                             | Drives marketing placement count                                                                                               |
| `/admin/commissions`       | Per-agency commission ledger; mark invoiced / paid / written-off                                                                     | Existing `commissions` table; admin-only RLS already present                                                                   |
| `/admin/employers`         | Employer + agency CRUD: company, contact, relationship_type, commission_rate, **invite contact user**                                | "Invite" sends a magic-link signup; on signup the new profile gets `role='employer'`, `employer_id=<this row>`                 |
| `/admin/payments`          | Stripe payment ledger, manual Plan-3 grant override                                                                                  | Per `ec-admin-operations.md`                                                                                                   |
| `/admin/coaching`          | `coaching_products` catalog CRUD + enrollment list                                                                                   | Sprint 7 deliverable                                                                                                           |

Sidebar: a second `sidebar-config.ts` entry array gated on `role === 'admin'`, rendered when the user is inside `/admin/*`. Existing candidate sidebar shows a tiny "Admin" link to switch surfaces.

---

## Agency / employer surface (`/employer/*`)

Phase 2 build, planned now. Multi-tenant via `profiles.employer_id` — every fetch filters by `current_employer_id()`. The user-chosen scope is **full PII on expressions of interest** (overrides the PII-gated Phase 2 default in `ec-admin-operations.md`).

| Route                         | Purpose                                                                                                   | Notes                                                                                                                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/employer`                   | Dashboard: active roles, interested candidates count, placements, commission earned                       | Tiles only                                                                                                                                                                                                               |
| `/employer/jobs`              | List + create their own roles                                                                             | Server action `createJob` writes `submitted_by = current_employer_id()`. Job tier is auto-set to `tier_2` (agency-submitted, non-priority) per `ec-candidate-journey.md` tier table; admin can later promote to `tier_3` |
| `/employer/jobs/[id]/edit`    | Edit / archive / mark filled their own jobs only                                                          | RLS enforces ownership                                                                                                                                                                                                   |
| `/employer/applications`      | Candidates who expressed interest in their roles                                                          | **Full candidate profile visible: name, email, phone, LinkedIn, resume, ATS score, assessment summaries.** Filter by job, status                                                                                         |
| `/employer/applications/[id]` | One application: full candidate profile + status log + "advance to screening / interviewing / offer" CTAs | Status updates write through to `applications` — employer can move statuses; final `placed` still requires Lauren (commission/fee flow)                                                                                  |
| `/employer/placements`        | Their placements + commission status (read-only)                                                          | Earnings transparency                                                                                                                                                                                                    |

Note on the PII decision: this is a meaningful trust shift from `ec-admin-operations.md` and from the candidate's expectation (`ec-candidate-journey.md` doesn't mention employers seeing PII at the express-interest stage). Worth surfacing to candidates at the "Express interest" CTA: _"Your full profile will be shared with the hiring company."_ Add to the express-interest confirmation in the job-board plan.

---

## RLS additions (all colocated with the relevant tables)

```sql
-- jobs: read = any authenticated; write = admin OR employer-owning-this-row
drop policy if exists jobs_write_admin on jobs;
create policy jobs_write_admin on jobs for all to authenticated
  using (is_admin()) with check (is_admin());
create policy jobs_write_owner_employer on jobs for all to authenticated
  using (is_employer() and submitted_by = current_employer_id())
  with check (is_employer() and submitted_by = current_employer_id());

-- applications: candidate-self + admin (already in job-board plan) + employer-of-the-job
create policy applications_read_employer on applications for select to authenticated
  using (
    is_employer() and exists (
      select 1 from jobs j
      where j.id = applications.job_id and j.submitted_by = current_employer_id()
    )
  );
create policy applications_update_employer on applications for update to authenticated
  using (
    is_employer() and exists (
      select 1 from jobs j
      where j.id = applications.job_id and j.submitted_by = current_employer_id()
    )
  )
  with check (
    is_employer() and status in ('screening','interviewing','offer','rejected')
  );

-- profiles: employer can read profiles of candidates who applied to their jobs
create policy profiles_read_employer_on_interest on profiles for select to authenticated
  using (
    is_employer() and exists (
      select 1 from applications a
      join jobs j on j.id = a.job_id
      where a.profile_id = profiles.id and j.submitted_by = current_employer_id()
    )
  );

-- resumes, linkedin_profiles, candidate_scores, assessment_responses:
-- mirror the same employer-on-interest pattern for read-only access.

-- employers + commissions: admin only (already in place via JWT metadata; rewrite to use is_admin())
-- placements: read = admin + the employer it belongs to; write = admin only
```

Every new policy is colocated with the table's other policies — no "we'll add policies later" per `docs/ec-dev-plan.md` cross-cutting rules.

---

## Critical files to create / modify

### Create

| Path                                                    | Purpose                                                                                                                       |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/<ts>_role_enum.sql`                | Role enum, employer_id FK, helper functions                                                                                   |
| `supabase/migrations/<ts>_replace_is_admin_rls.sql`     | (Conditional) rewrite job-board RLS to use `is_admin()` + drop `is_admin` column                                              |
| `supabase/migrations/<ts>_employer_rls.sql`             | Employer-scoped RLS on jobs, applications, profiles, resumes, etc.                                                            |
| `src/app/admin/layout.tsx`                              | Server admin guard + admin sidebar shell                                                                                      |
| `src/app/admin/page.tsx`                                | Overview tiles                                                                                                                |
| `src/app/admin/candidates/page.tsx` + `[id]/page.tsx`   | Candidate pool + detail                                                                                                       |
| `src/app/admin/applications/page.tsx` + `[id]/page.tsx` | Lauren's pipeline kanban (the S6 view)                                                                                        |
| `src/app/admin/placements/page.tsx`                     | Placement ledger                                                                                                              |
| `src/app/admin/commissions/page.tsx`                    | Commission ledger                                                                                                             |
| `src/app/admin/employers/page.tsx` + `[id]/page.tsx`    | Employer CRUD + invite-contact                                                                                                |
| `src/app/admin/payments/page.tsx`                       | Payment ledger + manual Plan-3 grant                                                                                          |
| `src/app/admin/coaching/page.tsx`                       | Coaching catalog CRUD (S7)                                                                                                    |
| `src/app/employer/layout.tsx`                           | Employer guard (role in admin/employer) + employer sidebar                                                                    |
| `src/app/employer/page.tsx`                             | Employer dashboard                                                                                                            |
| `src/app/employer/jobs/...`                             | Employer job CRUD (scoped)                                                                                                    |
| `src/app/employer/applications/...`                     | Candidates who expressed interest                                                                                             |
| `src/app/employer/placements/page.tsx`                  | Their placements + commission visibility                                                                                      |
| `src/app/actions/admin.ts`                              | `updateApplicationStatus`, `markAsPlaced`, `grantPlan3`, `inviteEmployerContact`, `updateInternalNotes`, `markCommissionPaid` |
| `src/app/actions/employer.ts`                           | Employer-scoped variants of job CRUD + application status updates                                                             |
| `src/components/admin/admin-sidebar.tsx`                | Admin nav                                                                                                                     |
| `src/components/admin/candidates-table.tsx`             | Filterable table client                                                                                                       |
| `src/components/admin/pipeline-kanban.tsx`              | All-candidates kanban (different from candidate self-view)                                                                    |
| `src/components/employer/employer-sidebar.tsx`          | Employer nav                                                                                                                  |
| `src/lib/auth/require-role.ts`                          | Server helper: `requireAdmin()`, `requireEmployer()`, `requireEmployerScope(employerId)` — call inside server actions         |

### Modify

| Path                          | Change                                                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(app)/layout.tsx`    | After fetching profile, if `role === 'admin'` show "Admin" link in sidebar; if `role === 'employer'` redirect to `/employer` instead of `/dashboard` |
| `src/lib/query-keys.ts`       | Add `queryKeys.admin.*` (candidates, applications, placements, commissions, payments) and `queryKeys.employer.*` (jobs, applications) namespaces     |
| `src/types/database.types.ts` | Regenerate via `npm run supabase:types` after each migration                                                                                         |
| `src/lib/supabase/server.ts`  | No change needed — RLS does the work                                                                                                                 |
| `docs/db_schema.md`           | Document `profiles.role`, `profiles.employer_id`, `profiles.internal_notes`, the `is_admin()` / `is_employer()` / `current_employer_id()` functions  |
| `docs/ec-admin-operations.md` | Update Phase 2 agency spec to reflect "full PII on expressions of interest" decision                                                                 |
| `docs/ec-job-board-plan.md`   | Replace `profiles.is_admin` references with the role enum; reuse `is_admin()` in RLS                                                                 |
| `docs/ec-dev-plan.md`         | Note that S4/S6/S7 admin UIs now have an authoritative plan                                                                                          |
| `CLAUDE.md`                   | Add role model to the Architecture section if it becomes load-bearing                                                                                |

---

## Patterns to reuse (don't reinvent)

- **Server-side auth guard + redirect**: `src/app/(app)/layout.tsx:25-33` — copy this exact shape into the admin and employer layouts.
- **Server/Client split with `initialData`**: `src/app/(app)/dashboard/page.tsx` → `dashboard-client.tsx` is the canonical example.
- **Server actions**: `src/app/actions/resume.ts` style — `'use server'`, `createServerClient` from `src/lib/supabase/server.ts`, `revalidatePath` after mutation, return `{ ok, error }`.
- **Realtime notifications**: the candidate pipeline already plans `useApplicationNotifications` in the job-board plan. For Lauren, mount a parallel `useAdminApplicationNotifications` (subscribes to all `applications` rows) inside `/admin/layout.tsx`.
- **Query keys**: nested namespace like existing `queryKeys.posts.detail(id)` in `src/lib/query-keys.ts`.

---

## Sequencing (recommended)

If we build now:

1. **Coordinate with the job-board plan** — land the role enum migration **before** `docs/ec-job-board-plan.md` ships, so the job-board RLS uses `is_admin()` directly and there's no boolean-then-enum churn.
2. **Super admin slice 1** (sufficient for Sprint 4): `/admin/jobs` (already in job-board plan, just retarget the guard) + `/admin/candidates` + `/admin/payments` with manual Plan-3 grant.
3. **Super admin slice 2** (Sprint 6): `/admin/applications` kanban + `/admin/placements` + mark-as-placed flow.
4. **Super admin slice 3** (Sprint 7): `/admin/coaching` + `/admin/commissions` + `/admin/employers`.
5. **Employer portal** (Phase 2 / Sprint P2-1): `/employer/*` routes + employer-scoped RLS. Schema already exists from step 1, so it's pure UI + RLS additions.

If we choose not to build the agency portal now (the canonical Phase 2 framing), the role enum still ships now and the employer routes remain a documented spec.

---

## Verification

Manual (no automated tests in repo):

1. `npm run type-check` and `npm run check` clean after each migration.
2. **Role enum migration**: in Supabase Studio, set Lauren's `role = 'admin'`. Visit `/admin` → loads. Visit as a `candidate` user → redirects to `/dashboard`.
3. **Admin candidate pool**: candidates appear with correct plan + scores; filters work; clicking through to `/admin/candidates/[id]` shows full profile + applications + payments.
4. **Admin pipeline kanban**: drag an application from `interested` → `screening` → confirm `applications.status_log` jsonb appends `{status, at, by}`. Confirm the candidate's own `/pipeline` kanban updates via realtime.
5. **Mark-as-placed**: from an application detail page, click "Mark as placed" → `placements` row created; if employer is `agency_partner`, `commissions` row created at the correct rate.
6. **Employer scoping** (if implementing): create an employer + invite-contact; new user signs up via magic link with `role='employer'`, `employer_id` set. Visit `/employer/jobs` → only their jobs visible. Submit a new job → ends up with `submitted_by` = their `employer_id`. Visit `/employer/applications` → candidate who expressed interest is visible with full PII (name, email, resume link). Attempt to visit `/admin/*` → redirected. Attempt direct SQL `select * from jobs where submitted_by != current_employer_id()` with their JWT → blocked by RLS.
7. **RLS adversarial**: as a candidate, attempt `select * from profiles where id != auth.uid()` → blocked except for their own row. As employer A, attempt to read employer B's jobs → blocked.
