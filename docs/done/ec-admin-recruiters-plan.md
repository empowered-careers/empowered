# Recruiters Portal (Plan)

> Covers both **agency partners** and **corporate / direct clients** — a single portal serves both, distinguished by `employers.relationship_type`.

> Last updated: 2026-05-23
> Status: Shipped 2026-05-23 (Sprint P2-1)
> Prerequisite: `docs/done/ec-admin-super-plan.md` (role enum + `is_employer()` / `current_employer_id()` helpers must ship first)
> Related: `docs/ec-admin-operations.md` (Phase 2 framing — this plan **overrides** the PII gate decision)

## Context

`docs/ec-admin-operations.md` defers an agency portal to Phase 2: Lauren manages employer + agency relationships manually in Google Sheets until 10+ agencies are onboarded. This plan describes what gets built when that gate is hit.

Two user-facing entity types both live in the `employers` table, distinguished by `employers.relationship_type`:

- **Corporate / direct client** (`relationship_type='direct_client'`) — one company posts roles for itself. `jobs.company_name` and the employer row refer to the same entity.
- **Agency partner** (`relationship_type='agency_partner'`) — one agency posts roles on behalf of _many_ different end-client companies. The agency row in `employers` is the agency itself; the end-client per role needs separate tracking.

The same end-company (e.g. "Acme") can appear in **multiple unrelated places**: as a direct-client `employers` row posting its own roles, _and_ as an end-client label inside Agency X's portal, _and_ as an end-client label inside Agency Y's portal. Each of those must be invisible to the others. This drives the schema choice below.

User decisions captured up front:

- **Multi-client per agency**: model end-clients as `client_companies` rows owned by the agency. **Not** a self-referential `employers.parent_employer_id` (that model breaks because Acme can't simultaneously be "its own direct-client row" and "a child of Agency X").
- **Visibility scoping**: RLS keys on `jobs.submitted_by = current_employer_id()`. End-client labeling is private metadata per agency — it never affects who can see a row.
- **PII scope**: an employer user sees **full candidate PII on expressions of interest** — name, email, phone, LinkedIn, resume, ATS score, assessment summaries. This overrides the PII-gated default in `ec-admin-operations.md`. Surface this to candidates at the "Express interest" CTA so consent is informed.

---

## Schema additions

Assumes `docs/done/ec-admin-super-plan.md` already shipped the `role` enum, `employer_id` FK, and `is_employer()` / `current_employer_id()` helpers.

### Migration `<ts>_client_companies.sql`

```sql
create table client_companies (
  id uuid primary key default gen_random_uuid(),
  agency_employer_id uuid not null references employers(id) on delete cascade,
  name text not null,
  contact_name text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_employer_id, name)
);
create index client_companies_agency_idx on client_companies(agency_employer_id);

alter table jobs
  add column client_company_id uuid references client_companies(id) on delete set null;
create index jobs_client_company_idx on jobs(client_company_id) where client_company_id is not null;

-- RLS: each agency only sees its own client_companies rows. Lauren sees all.
alter table client_companies enable row level security;
create policy client_companies_self on client_companies for all to authenticated
  using (is_employer() and agency_employer_id = current_employer_id())
  with check (is_employer() and agency_employer_id = current_employer_id());
create policy client_companies_admin on client_companies for all to authenticated
  using (is_admin()) with check (is_admin());
```

Notes:

- `client_companies` is **not** a copy of `employers`. It's an agency-private labeling table. Same name in two different agencies = two unrelated rows.
- `jobs.client_company_id` is nullable: direct-client employers leave it null; agencies set it when posting on behalf of a client.
- A `direct_client` employer using the portal can ignore `client_companies` entirely — the UI just hides the field for them based on `relationship_type`.

### Migration `<ts>_employer_rls.sql`

```sql
-- jobs: employer can read all (already allowed to authenticated) and write their own
create policy jobs_write_owner_employer on jobs for all to authenticated
  using (is_employer() and submitted_by = current_employer_id())
  with check (is_employer() and submitted_by = current_employer_id());

-- applications: employer reads + updates applications on their jobs
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
-- 'placed' stays admin-only — drives commissions + fees, needs Lauren.

-- candidate PII: employer reads candidate-derived tables only for candidates who applied to their jobs
create policy profiles_read_employer_on_interest on profiles for select to authenticated
  using (
    is_employer() and exists (
      select 1 from applications a
      join jobs j on j.id = a.job_id
      where a.profile_id = profiles.id and j.submitted_by = current_employer_id()
    )
  );

-- Mirror the same employer-on-interest pattern (read-only) for:
--   resumes, linkedin_profiles, candidate_scores, assessment_responses
-- Schema is identical — repeat the policy with the relevant table's profile_id column.

-- placements: employer reads their own; writes stay admin-only
create policy placements_read_employer on placements for select to authenticated
  using (is_employer() and employer_id = current_employer_id());
```

Note that the visibility scoping is entirely `jobs.submitted_by = current_employer_id()` — `client_company_id` plays no role in access control. Agency X posting for "Acme" never sees Acme's direct-client posts (different `submitted_by`).

---

## Routes (`/employer/*`)

Server components fetch + pass `initialData` to clients per the project's Server/Client split pattern.

| Route                         | Purpose                                                                                              | Notes                                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/employer`                   | Dashboard tiles: active roles, interested candidates, placements, commission earned                  | For agency users: also a "by client" rollup using `client_company_id`                                                                                        |
| `/employer/clients`           | (Agency only) List + CRUD client_companies. Hidden for `direct_client` employers                     | Empty state encourages "Add your first client to start posting roles"                                                                                        |
| `/employer/clients/[id]`      | (Agency only) One client: roles posted, candidates interested, placements made                       | Pure rollup view; no client-facing comms                                                                                                                     |
| `/employer/jobs`              | List + create their own roles                                                                        | `createJob` server action writes `submitted_by = current_employer_id()`. Agencies pick a `client_company_id` from a dropdown; direct clients skip that field |
| `/employer/jobs/[id]/edit`    | Edit / archive / mark filled their own jobs only                                                     | RLS enforces ownership                                                                                                                                       |
| `/employer/applications`      | Candidates who expressed interest in their roles                                                     | Full candidate PII visible (per the user decision above). Filter by job, status, and (for agencies) client                                                   |
| `/employer/applications/[id]` | One application: candidate profile + status log + "advance to screening / interviewing / offer" CTAs | Employer can move statuses except `placed` (admin-only)                                                                                                      |
| `/employer/placements`        | Their placements + commission status (read-only)                                                     | For agencies: groupable by `client_company_id`                                                                                                               |

**Job-tier rule for employer-submitted roles**: auto-set to `tier_2` (agency-submitted, non-priority per `ec-candidate-journey.md` tier table). Lauren can promote to `tier_3` from `/admin/jobs/[id]/edit`. Tier 1 remains Lauren-curated only.

**Auth guard** — `src/app/employer/layout.tsx`:

- Allow `role in ('admin','employer')` so Lauren can impersonate-view by visiting employer routes.
- Fetch `employer_id` and pass to client via context.
- If `role === 'employer'` with null `employer_id` → redirect to a "your account isn't linked to a company yet" page.

---

## Candidate-facing change

The "Express interest" CTA in the job-board flow must surface the PII consent: _"Your full profile (name, email, resume, assessment results) will be shared with the hiring company."_ Wire this into the confirmation step planned in `docs/done/ec-candidate-pipeline-plan.md` (the `expressInterest` action — shipped 2026-05-20). Without informed consent the PII policy is a trust violation.

---

## Critical files to create / modify

### Create

| Path                                                          | Purpose                                                                                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `supabase/migrations/<ts>_client_companies.sql`               | `client_companies` table + `jobs.client_company_id` FK + RLS                                                                                     |
| `supabase/migrations/<ts>_employer_rls.sql`                   | Employer-scoped RLS on jobs, applications, profiles, resumes, candidate_scores, etc.                                                             |
| `src/app/employer/layout.tsx`                                 | Employer guard (role in admin/employer) + employer sidebar shell                                                                                 |
| `src/app/employer/page.tsx`                                   | Dashboard tiles + (agency) by-client rollup                                                                                                      |
| `src/app/employer/clients/page.tsx` + `[id]/page.tsx`         | (Agency-only) client_companies CRUD                                                                                                              |
| `src/app/employer/jobs/page.tsx` + `[id]/edit/page.tsx`       | Employer job CRUD (scoped)                                                                                                                       |
| `src/app/employer/applications/page.tsx` + `[id]/page.tsx`    | Candidates who expressed interest                                                                                                                |
| `src/app/employer/placements/page.tsx`                        | Their placements + commission visibility                                                                                                         |
| `src/app/actions/employer.ts`                                 | Employer-scoped server actions: `createJob`, `updateJob`, `archiveJob`, `advanceApplicationStatus`, `createClientCompany`, `updateClientCompany` |
| `src/components/employer/employer-sidebar.tsx`                | Employer nav (Clients link hidden for direct-client relationship_type)                                                                           |
| `src/components/employer/job-form.tsx`                        | Job create/edit form — agencies see client_company picker; direct clients don't                                                                  |
| `src/components/employer/candidate-card.tsx`                  | Full-PII candidate card for the applications views                                                                                               |
| `src/hooks/useEmployerApplicationNotifications.ts`            | Realtime subscription on applications for the employer's jobs                                                                                    |
| `src/lib/auth/require-role.ts` (extend the super-plan helper) | Add `requireEmployer()`, `requireEmployerScope(employerId)`, `requireAgency()`                                                                   |

### Modify

| Path                           | Change                                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(app)/layout.tsx`     | When `role === 'employer'`, redirect to `/employer` instead of `/dashboard` (already done by super-plan as a no-op — this is when it activates) |
| `src/lib/query-keys.ts`        | Add `queryKeys.employer.*` (jobs, applications, clients, placements) namespace                                                                  |
| `src/types/database.types.ts`  | Regenerate via `npm run supabase:types` after migrations                                                                                        |
| `src/app/actions/jobs.ts`      | The candidate-facing `expressInterest` action: render PII consent copy in its confirmation UI                                                   |
| `docs/db_schema.md`            | Document `client_companies` table + `jobs.client_company_id`                                                                                    |
| `docs/ec-admin-operations.md`  | Update Phase 2 agency spec: full PII visible on expressions of interest (was: PII gated until match confirmed)                                  |
| `docs/ec-candidate-journey.md` | Add a note at "Express interest" that the hiring company will see full profile                                                                  |

---

## Patterns to reuse

- Same as super plan: server-side auth guard, Server/Client split with `initialData`, server-action shape, realtime hook shape.
- **Multi-tenant query pattern**: every employer-side fetch joins through `jobs` filtered by `submitted_by = current_employer_id()`. RLS enforces it; explicit filter in the query short-circuits irrelevant rows server-side.

---

## Sequencing

This plan is gated on `docs/done/ec-admin-super-plan.md` shipping (specifically the role enum + helper functions). Within itself:

1. `client_companies` migration + employer RLS migration.
2. Auth guard + sidebar shell.
3. Jobs CRUD (the core agency value prop — submitting roles).
4. Applications view (full-PII candidate cards).
5. Clients view + by-client rollups (agency-only polish).
6. Placements + commission visibility (read-only — admin still writes).

---

## Verification

Manual (no automated tests in repo):

1. `npm run type-check` and `npm run check` clean after each migration.
2. **Setup**: in `/admin/employers`, create:
   - Acme Corp (direct_client) + invite Acme contact → contact-A signs up.
   - Agency X (agency_partner) + invite Agency-X contact → contact-X signs up.
   - Agency Y (agency_partner) + invite Agency-Y contact → contact-Y signs up.
3. **Agency client labels are private**:
   - Sign in as contact-X. Visit `/employer/clients`. Add "Acme" as a client. Post one job for Acme (`client_company_id` set).
   - Sign in as contact-Y. Visit `/employer/clients`. Add "Acme" as a client (different row, same name allowed across agencies). Post one job for Acme.
   - Sign in as contact-A (Acme direct). Post one job (no `client_company_id`).
   - Sign in as contact-X. `/employer/jobs` shows only the one Agency-X-posted Acme role. Acme's direct post and Agency-Y's Acme post are invisible.
   - Sign in as contact-A. `/employer/jobs` shows only Acme's direct post. Both agency-posted Acme roles invisible.
4. **PII on expressions of interest**:
   - Sign in as a candidate. Express interest on Agency-X's Acme role. Confirmation dialog states profile will be shared.
   - Sign in as contact-X. `/employer/applications` shows the candidate with full PII (name, email, resume link). `/employer/applications/[id]` exposes resume + LinkedIn + assessment scores.
   - Sign in as contact-Y. `/employer/applications` empty (no application against any Agency-Y job).
   - Sign in as contact-A. `/employer/applications` empty (no application against Acme's direct post).
5. **Status moves**: contact-X advances application to `screening`. Candidate's `/pipeline` updates via realtime. Contact-X attempts to set status to `placed` → blocked by RLS (`with check status in (...)` excludes `placed`).
6. **Direct-client UX hides client picker**: contact-A creates a job — no `client_company_id` field shown. The `/employer/clients` link is hidden in the sidebar.
7. **RLS adversarial**:
   - As contact-X, attempt `select * from client_companies` via Supabase Studio with their JWT → returns only Agency-X's rows.
   - As contact-X, attempt `update jobs set ... where id = <Agency-Y's job id>` → blocked.
   - As contact-X, attempt `insert into client_companies(agency_employer_id, name) values (<Agency-Y's employer id>, 'Acme')` → blocked by `with check`.
   - As any employer, attempt to read profile data for a candidate who hasn't applied to one of their jobs → blocked.
8. **Lauren reconciliation**: in `/admin/employers` Lauren sees all three Acmes (one direct, two as labels under different agencies). In `/admin/placements` she can manually reconcile if needed.
