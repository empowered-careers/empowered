# Super Admin Console (Plan)

> Last updated: 2026-05-20
> Status: **All slices shipped 2026-05-20.** Every route from the route table is live: `/admin` overview tiles, `/admin/jobs` (via `docs/done/ec-job-board-plan.md`), `/admin/candidates` + `[id]`, `/admin/payments` (ledger + manual Plan-3 grant), `/admin/applications` kanban + `[id]` detail with mark-as-placed, `/admin/placements`, `/admin/commissions`, `/admin/employers` + `[id]`, `/admin/coaching`. RLS in `20260520040000_admin_rls.sql`. Admin realtime hook mounted via `src/components/admin/admin-realtime.tsx`. `inviteEmployerContact` returns an explanatory error until `docs/ec-admin-agency-plan.md` ships `/employer` routes.
> Related: `docs/done/ec-job-board-plan.md` (shipped — admin job CRUD lives there), `docs/done/ec-candidate-pipeline-plan.md` (shipped — candidate side of applications), `docs/ec-admin-recruiters-plan.md` (Phase 2 sibling)

## Context

The platform today has no admin surface. Lauren manages everything via Supabase Studio + Google Sheets (per `docs/ec-admin-operations.md`). This plan covers the **super admin console** for Lauren + team — full visibility over jobs, candidates, applications, payments, placements, commissions, enrollments. It replaces ad-hoc SQL work and is sliced across Sprints 4 / 6 / 7 in `docs/ec-dev-plan.md`.

This plan provides the role/auth substrate (`role` enum + `is_admin()` / `is_employer()` / `current_employer_id()` helpers) that `docs/done/ec-job-board-plan.md`, `docs/done/ec-candidate-pipeline-plan.md`, `docs/ec-events-growth-plan.md`, and `docs/ec-admin-recruiters-plan.md` all depend on. **The role-enum migration in this plan must land first**, before any of those plans ship, so their RLS policies can reference `is_admin()` directly.

User decisions captured up front:

- **Role model**: `profiles.role` enum (`candidate` | `admin` | `employer`) + `profiles.employer_id` FK. Replaces `is_admin`. The `employer` value exists from day one so the agency plan can layer on without a second enum migration.
- **Build scope**: super admin sliced across S4 / S6 / S7. Agency portal lives in its own plan.

---

## Role + auth model

### Migration `<ts>_role_enum.sql`

```sql
create type user_role as enum ('candidate', 'admin', 'employer');

alter table profiles
  add column role user_role not null default 'candidate',
  add column employer_id uuid references employers(id) on delete set null,
  add column internal_notes text;

create index profiles_role_idx on profiles(role);
create index profiles_employer_id_idx on profiles(employer_id) where employer_id is not null;

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

`is_employer()` and `current_employer_id()` ship now even though the agency portal is Phase 2 — they cost nothing and let `docs/ec-admin-recruiters-plan.md` add policies later without re-touching helper functions.

### Auth guard

Mirror `src/app/(app)/layout.tsx:25-33`. Create `src/app/admin/layout.tsx`:

- Server-side `select role from profiles where id = user.id`.
- If `!== 'admin'` → `redirect('/dashboard')`.
- Renders admin shell (sidebar with admin nav).

Update `src/app/(app)/layout.tsx`: after profile fetch, if `role === 'admin'` show an "Admin" link in the candidate sidebar so Lauren can switch surfaces. If `role === 'employer'` → `redirect('/employer')` (route exists once the agency plan ships; until then, employer-role accounts shouldn't exist).

---

## Routes (`/admin/*`)

Server components fetch + pass `initialData` to clients per the project's Server/Client split pattern.

| Route                      | Purpose                                                                                                                              | Sprint |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `/admin`                   | Overview tiles: active candidates (free vs paid), open roles by tier, applications by status, placements MTD, commission outstanding | S4     |
| `/admin/jobs`              | List + create Tier 1/2/3 jobs                                                                                                        | S4     |
| `/admin/jobs/[id]/edit`    | Edit, archive, mark filled, change tier                                                                                              | S4     |
| `/admin/candidates`        | Candidate pool: filterable table (plan, completeness, role-clarity score, assessment count, signup date)                             | S4     |
| `/admin/candidates/[id]`   | One candidate: resume + LinkedIn + assessments + match scores + applications + payments + internal notes                             | S4     |
| `/admin/payments`          | Stripe payment ledger + manual Plan-3 grant override                                                                                 | S4     |
| `/admin/applications`      | Pipeline kanban across **all** candidates (the S6 deliverable)                                                                       | S6     |
| `/admin/applications/[id]` | Single application: candidate + job + status log + notes + mark-as-placed CTA                                                        | S6     |
| `/admin/placements`        | Placement table, mark guarantee period, finalize, refund — drives marketing placement count                                          | S6     |
| `/admin/commissions`       | Per-agency commission ledger; mark invoiced / paid / written-off                                                                     | S7     |
| `/admin/employers`         | Employer + agency CRUD: company, contact, relationship_type, commission_rate, **invite contact user**                                | S7     |
| `/admin/coaching`          | `coaching_products` catalog CRUD + enrollment list                                                                                   | S7     |

"Invite contact user" on `/admin/employers/[id]` sends a magic-link signup; on signup the new profile gets `role='employer'`, `employer_id=<this row>`. The link is dormant until the agency plan ships — until then no employer routes exist to land on, so don't surface the invite button before S7.

Sidebar: an admin entry array in `src/components/app-shell/sidebar-config.ts` gated on `role === 'admin'`, rendered when inside `/admin/*`.

---

## RLS

Most admin actions go through `is_admin()` against tables that already have row-level policies:

```sql
-- jobs: read = any authenticated; write = admin (employer write added in agency plan)
drop policy if exists jobs_write_admin on jobs;
create policy jobs_write_admin on jobs for all to authenticated
  using (is_admin()) with check (is_admin());

-- applications: candidate-self + admin-all
create policy applications_admin_all on applications for all to authenticated
  using (is_admin()) with check (is_admin());

-- placements: admin-all (read + write)
create policy placements_admin_all on placements for all to authenticated
  using (is_admin()) with check (is_admin());

-- commissions: admin-only (already in place via JWT metadata; rewrite to use is_admin())
drop policy if exists commissions_admin_only on commissions;
create policy commissions_admin_only on commissions for all to authenticated
  using (is_admin()) with check (is_admin());

-- employers: admin-only (likewise rewrite from JWT metadata to is_admin())
drop policy if exists "employers: admin only" on employers;
create policy employers_admin_only on employers for all to authenticated
  using (is_admin()) with check (is_admin());

-- profiles.internal_notes: admin can update everyone; candidates can never read others' rows
-- (existing candidate-self policy on profiles still applies)
create policy profiles_admin_update on profiles for update to authenticated
  using (is_admin()) with check (is_admin());
```

All policies colocated with the table's other policies per `docs/ec-dev-plan.md` cross-cutting rules.

---

## Critical files to create / modify

### Create

| Path                                                    | Purpose                                                                                                                       |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/<ts>_role_enum.sql`                | Role enum, employer_id FK, internal_notes column, helper functions                                                            |
| `supabase/migrations/<ts>_admin_rls.sql`                | Admin policies on jobs, applications, placements, commissions, employers, profiles                                            |
| `src/app/admin/layout.tsx`                              | Server admin guard + admin sidebar shell                                                                                      |
| `src/app/admin/page.tsx`                                | Overview tiles                                                                                                                |
| `src/app/admin/jobs/page.tsx` + `[id]/edit/page.tsx`    | Job CRUD (S4 — coordinates with job-board plan)                                                                               |
| `src/app/admin/candidates/page.tsx` + `[id]/page.tsx`   | Candidate pool + detail (S4)                                                                                                  |
| `src/app/admin/payments/page.tsx`                       | Payment ledger + manual Plan-3 grant (S4)                                                                                     |
| `src/app/admin/applications/page.tsx` + `[id]/page.tsx` | Lauren's pipeline kanban (S6)                                                                                                 |
| `src/app/admin/placements/page.tsx`                     | Placement ledger (S6)                                                                                                         |
| `src/app/admin/commissions/page.tsx`                    | Commission ledger (S7)                                                                                                        |
| `src/app/admin/employers/page.tsx` + `[id]/page.tsx`    | Employer CRUD + invite-contact (S7)                                                                                           |
| `src/app/admin/coaching/page.tsx`                       | Coaching catalog CRUD (S7)                                                                                                    |
| `src/app/actions/admin.ts`                              | `updateApplicationStatus`, `markAsPlaced`, `grantPlan3`, `inviteEmployerContact`, `updateInternalNotes`, `markCommissionPaid` |
| `src/components/admin/admin-sidebar.tsx`                | Admin nav                                                                                                                     |
| `src/components/admin/candidates-table.tsx`             | Filterable table client                                                                                                       |
| `src/components/admin/pipeline-kanban.tsx`              | All-candidates kanban (distinct from candidate self-view at `/pipeline`)                                                      |
| `src/lib/auth/require-role.ts`                          | Server helper: `requireAdmin()` — call inside server actions                                                                  |
| `src/hooks/useAdminApplicationNotifications.ts`         | Realtime subscription on all `applications` rows; mounted in `/admin/layout.tsx`                                              |

### Modify

| Path                             | Change                                                                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(app)/layout.tsx`       | After fetching profile, show "Admin" sidebar link if `role === 'admin'`; redirect to `/employer` if `role === 'employer'`                           |
| `src/lib/query-keys.ts`          | Add `queryKeys.admin.*` (candidates, applications, placements, commissions, payments) namespace                                                     |
| `src/types/database.types.ts`    | Regenerate via `npm run supabase:types` after each migration                                                                                        |
| `docs/db_schema.md`              | Document `profiles.role`, `profiles.employer_id`, `profiles.internal_notes`, the `is_admin()` / `is_employer()` / `current_employer_id()` functions |
| `docs/done/ec-job-board-plan.md` | Already aligned — references `is_admin()` and depends on the role enum migration shipping first                                                     |
| `docs/ec-dev-plan.md`            | Note that S4/S6/S7 admin UIs have authoritative plans                                                                                               |

---

## Patterns to reuse

- **Server-side auth guard + redirect**: `src/app/(app)/layout.tsx:25-33`.
- **Server/Client split with `initialData`**: `src/app/(app)/dashboard/page.tsx` → `dashboard-client.tsx`.
- **Server actions**: `src/app/actions/resume.ts` style — `'use server'`, `createServerClient` from `src/lib/supabase/server.ts`, `revalidatePath` after mutation, return `{ ok, error }`.
- **Realtime hooks**: `useResumeNotifications` shape. `useAdminApplicationNotifications` subscribes without a `profile_id=eq` filter (admin sees all).
- **Query keys**: nested namespace like `queryKeys.posts.detail(id)`.

---

## Sequencing

1. **Land the role-enum migration before `docs/done/ec-job-board-plan.md` ships.** Coordinate the merge order so the job-board RLS references `is_admin()` from day one.
2. **Slice 1 (Sprint 4)**: `/admin`, `/admin/jobs`, `/admin/candidates`, `/admin/payments`.
3. **Slice 2 (Sprint 6)**: `/admin/applications` kanban, `/admin/placements`, mark-as-placed flow.
4. **Slice 3 (Sprint 7)**: `/admin/coaching`, `/admin/commissions`, `/admin/employers` (the last unlocks recruiters-plan execution).

---

## Verification

Manual (no automated tests in repo):

1. `npm run type-check` and `npm run check` clean after each migration.
2. **Role enum migration**: in Supabase Studio, set Lauren's `role = 'admin'`. Visit `/admin` → loads. Visit as a `candidate` user → redirects to `/dashboard`.
3. **Admin candidate pool**: candidates appear with correct plan + scores; filters work; clicking through to `/admin/candidates/[id]` shows full profile + applications + payments. Updating internal notes persists.
4. **Admin pipeline kanban**: drag an application from `interested` → `screening` → confirm `applications.status_log` jsonb appends `{status, at, by}`. Candidate's own `/pipeline` updates via realtime within ~1s.
5. **Mark-as-placed**: from an application detail page, click "Mark as placed" → `placements` row created; if employer is `agency_partner`, `commissions` row created at the correct rate.
6. **Manual Plan-3 grant**: in `/admin/payments`, grant Plan 3 to a candidate → their `profiles.plan` updates, Tier 3 jobs become visible to them.
7. **RLS adversarial**: as a candidate, attempt `select * from profiles where id != auth.uid()` via Supabase Studio with their JWT → blocked except their own row. Attempt `insert into jobs` → blocked.
