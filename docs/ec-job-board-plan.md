# Sprint 2 — Job Board + Candidate Pipeline (E4 Pulled Forward + slice of E6)

> Last updated: 2026-05-20
> Status: Plan approved, not yet implemented
> Related: `docs/ec-admin-views-plan.md` — authoritative for role/auth model and the admin shell. **The role enum migration from that plan lands first**; this plan's RLS uses its `is_admin()` helper, not a standalone boolean.

## Context

Sprint 2's exit criterion requires "a real candidate signs up, uploads resume, sees their ATS score, sees Job Tier 1 roles." The job board route shell exists (`src/app/(app)/job-board/`) but renders hardcoded mock data — no Supabase fetch, no Plan-gating, no way for Lauren to add roles. The `/pipeline` route is also stubbed but empty.

We're prioritizing the job board over Stripe (S3) because:

1. The paywall has nothing to gate until the board exists with lock states wired to `profiles.plan`.
2. Final tier pricing is still being decided — Stripe work would block on that anyway.
3. Lauren can curate Tier 1 in parallel while the board is being built.

This plan covers **(a)** the display board + admin seeding form + Save-for-later bookmarking and **(b)** the candidate-facing pipeline kanban driven by an "Express interest" CTA. Lauren's pipeline view + match scoring + "Why this matches you" reasoning stay deferred to S4/S6.

**Scope note**: pulling the candidate pipeline kanban forward means pulling `applications` table writes + the express-interest CTA from S4 into S2. Match-score-on-card stays deferred — express interest works without a computed match score.

---

## Decisions

- **Seeding**: minimal `/admin/jobs` form in S2 (not pure SQL) — pays off long-term, unblocks Lauren without engineer involvement.
- **Lock state UX**: Tier 2 and Tier 3 each render a locked banner showing live count of active roles + a CTA toward the relevant Plan upgrade. Matches `ec-ui-plan.md` Tab 3.
- **Card interactivity**: view + Save-for-later bookmark + "Express interest" CTA + dedicated detail page at `/job-board/[id]`. Express interest writes to `applications` and feeds the candidate pipeline kanban.
- **Filters**: wire all three chip groups (Tier, Remote policy, salary band) client-side over the fetched dataset.
- **Admin auth**: owned by `ec-admin-views-plan.md` — `profiles.role` enum (`candidate`/`admin`/`employer`) + `is_admin()` / `is_employer()` / `current_employer_id()` helper functions. This plan reuses those; no boolean column is introduced. Lauren's row is promoted via SQL once after the role migration ships. Admin layout + sidebar shell also come from admin-views.
- **Candidate pipeline kanban**: shown at `/pipeline`. Columns mirror the `application_status` enum (`interested`, `submitted`, `screening`, `interviewing`, `offer`, `placed`, `rejected`, `withdrawn`). In S2, candidates can only self-move into `interested` (via "Express interest" on a job card) or `withdrawn` (self-service). Lauren updates other statuses via SQL/Supabase Studio until S6 builds her admin pipeline UI.

---

## Scope

### In scope

1. Migration: RLS policies on `jobs` (read: authenticated; write: `is_admin()` — helper from admin-views plan) + seed system employer row + `can_see_job_tier(plan, job_tier)` SQL function.
2. Migration: `saved_jobs` table (profile_id, job_id, created_at) + RLS (self-only).
3. Migration: `applications` candidate-facing RLS — read self, insert self at `status='interested'`, update self only to `withdrawn`. Realtime publication on `applications`. (Admin + employer policies on `applications` ship with admin-views.)
4. Server fetch of jobs on `/job-board` page; pass to client with initialData hydration pattern.
5. Client board with real data: Tier 1 grid + Tier 2/3 locked banners with live counts.
6. Filter logic (tier, remote_policy, salary_min) over fetched dataset.
7. Save-for-later bookmark toggle on each card; wired to `saved_jobs`.
8. Sidebar "Saved roles" entry → `/job-board/saved` route showing bookmarked jobs.
9. Job detail page `/job-board/[id]` (server component, RLS-respecting; honors Plan gating).
10. `/admin/jobs` list + create + edit pages — slot into the admin shell + role guard provided by admin-views (do **not** re-implement the layout/guard here).
11. Plan-gating helper `src/lib/plan.ts` with `canSeeJobTier(plan, tier)` matching the Postgres function for client reuse.
12. `queryKeys.jobs` + `queryKeys.applications` added to `src/lib/query-keys.ts`.
13. Seed: one system employer row "Empowered Careers / Curated" so `jobs.submitted_by` FK holds for Lauren's roles.
14. "Express interest" CTA on each job card + detail page → inserts into `applications` at `status='interested'`. Idempotent. **Confirmation copy must disclose**: "Your full profile (resume, contact info, scores) will be shared with the hiring company if you express interest." — per the PII decision in admin-views.
15. `/pipeline` candidate kanban: server fetch of the user's `applications` joined to `jobs`; client renders a column per `application_status` enum value with the candidate's cards in the matching column.
16. Self-service "Withdraw" action on a candidate's own application → flips status to `withdrawn`.
17. Realtime subscription on `applications` filtered by `profile_id=eq.${userId}` so status moves Lauren makes show up live (reuses `useResumeNotifications` pattern shape).

### Out of scope (deferred — owned elsewhere)

- Role enum, `is_admin()` / `is_employer()` helpers, admin layout/sidebar/overview, `applications` admin+employer RLS, employer portal — **all owned by `ec-admin-views-plan.md`** and land first.
- Match score per card (S4 — needs `matches` rows + scoring algorithm).
- "Why this matches you" reasoning (S4).
- Lauren's admin pipeline view / kanban (S6 — owned by admin-views slice 2; in S2 Lauren updates statuses via SQL).
- Stripe-driven Plan upgrades (S3).
- Tier 2/3 unlock by assessments (S5 — for now Tier 2/3 stay locked for everyone except `plan_3`).

---

## Files to create

| Path                                                      | Purpose                                                                                                                                                                          |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/<ts>_jobs_rls_and_tier_fn.sql`       | RLS on `jobs` (read all auth; write via `is_admin()`); seed system employer; `can_see_job_tier(plan, job_tier)` SQL function. Depends on role enum migration from admin-views.   |
| `supabase/migrations/<ts>_saved_jobs.sql`                 | `saved_jobs` table + RLS (self-only read/write)                                                                                                                                  |
| `supabase/migrations/<ts>_applications_candidate_rls.sql` | Candidate-facing RLS on `applications` (read self, insert as `interested`, self-update only to `withdrawn`) + realtime publication. Admin/employer policies live in admin-views. |
| `src/lib/plan.ts`                                         | `canSeeJobTier(plan, tier)` + tier→required-plan mapping for CTAs                                                                                                                |
| `src/app/actions/jobs.ts`                                 | Server actions: `createJob`, `updateJob`, `archiveJob`, `toggleSavedJob`, `expressInterest`, `withdrawApplication`                                                               |
| `src/app/(app)/job-board/[id]/page.tsx`                   | Job detail server component; redirects if Plan can't see tier                                                                                                                    |
| `src/app/(app)/job-board/saved/page.tsx`                  | Saved-jobs list server component                                                                                                                                                 |
| `src/app/admin/jobs/page.tsx`                             | Admin jobs list + create form (server). Admin layout/guard ships with admin-views, not here.                                                                                     |
| `src/app/admin/jobs/[id]/edit/page.tsx`                   | Admin edit form                                                                                                                                                                  |
| `src/components/job-board/job-card.tsx`                   | Extracted reusable card with bookmark toggle                                                                                                                                     |
| `src/components/job-board/tier-locked-banner.tsx`         | Banner for locked Tier 2/3 with count + CTA                                                                                                                                      |
| `src/components/admin/job-form.tsx`                       | Client form for create/edit                                                                                                                                                      |
| `src/app/(app)/pipeline/page.tsx`                         | Candidate pipeline server component: fetch the user's `applications` joined to `jobs`; group by status; pass to client                                                           |
| `src/components/pipeline/pipeline-client.tsx`             | Kanban UI: one column per application_status enum value; cards draggable only for self-service moves (`interested`→`withdrawn`)                                                  |
| `src/components/pipeline/pipeline-card.tsx`               | Application card (job title, company, posted date, status pill, withdraw button when applicable)                                                                                 |
| `src/hooks/useApplicationNotifications.ts`                | Realtime subscription on `applications` for status changes; toast on `screening`/`interviewing`/`offer`/`placed` movements                                                       |

## Files to modify

| Path                                                  | Change                                                                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(app)/job-board/page.tsx`                    | Convert to real server component: parallel fetch of jobs by tier + saved-job IDs + user's existing applications + profile.plan; pass initialData to client |
| `src/components/job-board/job-board-client.tsx`       | Replace mock JOBS const with props; wire filters; render tier-locked banners using `canSeeJobTier`; integrate `JobCard` + bookmark + express-interest      |
| `src/components/job-board/job-card.tsx` (new)         | Card shows bookmark toggle + "Express interest" button (disabled/labeled "Interested ✓" if an application row already exists for this job)                 |
| `src/lib/query-keys.ts`                               | Add `queryKeys.jobs` (`all`, `byTier(tier)`, `detail(id)`, `saved(userId)`) and `queryKeys.applications` (`forUser(userId)`, `detail(id)`)                 |
| `src/components/providers/realtime-notifications.tsx` | Mount `useApplicationNotifications` alongside existing resume + linkedin notification hooks                                                                |
| `src/components/app-shell/sidebar-config.ts`          | Set `/job-board/saved` href on "Saved roles". (The admin sidebar section + role gating is owned by admin-views.)                                           |
| `src/types/database.types.ts`                         | Regenerate via `npm run supabase:types` after migrations                                                                                                   |
| `docs/ec-dev-plan.md`                                 | Tick Sprint 2 job-board checkboxes once landed                                                                                                             |
| `docs/db_schema.md`                                   | Document `saved_jobs` table (role/employer_id docs handled by admin-views)                                                                                 |
| `docs/todo.md`                                        | Update live checklist                                                                                                                                      |

---

## Patterns to reuse (don't reinvent)

- **Server/Client split with initialData**: mirror `src/app/(app)/dashboard/page.tsx` (parallel `Promise.all` fetches, auth guard with `redirect('/login')`, pass to client). See `dashboard-client.tsx` for the props-shape convention.
- **Server actions**: mirror `src/app/actions/resume.ts` style — `'use server'`, `createServerClient` from `src/lib/supabase/server.ts`, `revalidatePath` after mutation, return `{ ok, error }` shape.
- **Query key structure**: nested namespace like the existing `posts.detail(id)` in `src/lib/query-keys.ts`.
- **Sidebar nav**: entries already drafted in `src/components/app-shell/sidebar-config.ts:79-96` — just fill hrefs.

---

## Migration details (rough SQL shape — not final)

> Prerequisite: the role-enum migration from `ec-admin-views-plan.md` must land first so `is_admin()` exists.

```sql
-- tier visibility function (used by client helper + future RLS)
create or replace function can_see_job_tier(p plan, t job_tier) returns boolean
  language sql immutable as $$
  select case t
    when 'tier_1' then true
    when 'tier_2' then p in ('plan_1','plan_2','plan_3')
    when 'tier_3' then p = 'plan_3'
  end;
$$;

-- jobs RLS (reuses is_admin() from admin-views)
alter table jobs enable row level security;
create policy jobs_read_auth on jobs for select to authenticated using (true);
create policy jobs_write_admin on jobs for all to authenticated
  using (is_admin()) with check (is_admin());

-- system employer for Lauren-curated roles
insert into employers (id, name, relationship_type) values
  ('00000000-0000-0000-0000-000000000001', 'Empowered Careers / Curated', 'direct')
on conflict do nothing;

-- saved_jobs
create table saved_jobs (
  profile_id uuid references profiles(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, job_id)
);
alter table saved_jobs enable row level security;
create policy saved_self on saved_jobs for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- applications candidate-facing RLS only (admin + employer policies live in admin-views)
alter table applications enable row level security;
create policy applications_read_self on applications for select to authenticated
  using (profile_id = auth.uid());
create policy applications_insert_self on applications for insert to authenticated
  with check (profile_id = auth.uid() and status = 'interested');
create policy applications_update_self_withdraw on applications for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and status = 'withdrawn');

-- realtime publication for the candidate notification hook
alter publication supabase_realtime add table applications;
alter table applications replica identity full;
```

Note: `jobs` already exists from S1 migration; we're only adding RLS policies. Verify no policies already conflict before applying. The `jobs_write_owner_employer` policy and `applications_*_employer` / `applications_admin_all` policies are added by `ec-admin-views-plan.md` — don't duplicate.

---

## Verification

Manual end-to-end (no automated tests in this repo):

1. **Type safety**: `npm run type-check` clean after migrations + `npm run supabase:types`.
2. **Lint**: `npm run check` clean.
3. **Admin path** (requires admin-views role enum + admin layout to be live first):
   - Set `role = 'admin'` on Lauren's profile via SQL.
   - Visit `/admin/jobs` → form loads (guard provided by admin-views layout). Non-admin user redirects.
   - Create 12 Tier 1 jobs via the form. Confirm they land in `jobs` with `submitted_by` = system employer.
4. **Free candidate flow**:
   - Sign in as a `plan = 'free'` test user.
   - Visit `/job-board` → see all 12 Tier 1 cards. Tier 2 and Tier 3 sections show locked banners with counts (0 each initially; add one Tier 2 + one Tier 3 via admin to verify counts increment).
   - Filter chips: toggle Tier 1 / Remote / $200k+ → grid updates.
   - Click a card → `/job-board/[id]` loads description, requirements, salary band.
   - Bookmark a card → `saved_jobs` row created. Sidebar "Saved roles" → `/job-board/saved` lists it. Unbookmark removes it.
   - Click "Express interest" on a Tier 1 card → `applications` row created with `status='interested'`. Card button now reads "Interested ✓".
   - Navigate to `/pipeline` → see the role in the "Interested" column. Other columns empty.
   - In Supabase Studio, manually update the application row to `status='screening'`. Within ~1s the kanban shifts the card to the Screening column (realtime) and a Sonner toast fires.
   - Click "Withdraw" on the card → row updates to `status='withdrawn'`, card moves to Withdrawn column.
   - Attempt to update one's own application directly to `status='offer'` via SQL with the user's JWT → blocked by RLS.
5. **Plan_3 user**:
   - Manually set `plan = 'plan_3'` on a test profile via SQL.
   - Refresh `/job-board` → Tier 2 and Tier 3 cards now render fully (no locked banner).
6. **RLS sanity**:
   - As non-admin, attempt `insert into jobs` via Supabase Studio SQL with that user's JWT → blocked.
   - As user A, try to read user B's `saved_jobs` → blocked.
7. **Dev server**: `npm run dev`, walk the journey signed-out → signed-in → `/job-board` → detail → bookmark → saved. Watch console for errors.

---

## Risks / open items

- **Dependency on admin-views**: this plan can't ship until `ec-admin-views-plan.md` slice 1 (role enum + helpers + admin layout) has landed. If admin-views slips, fall back to a temporary inline `is_admin()` check in the jobs RLS policy and revisit later — but don't reintroduce a boolean column.
- **`jobs` may already have RLS policies from S1**: confirm in migration files before adding new ones; reconcile if conflicting.
- **`saved_jobs` is new schema** not in `docs/db_schema.md`; doc update needed alongside migration so it's not "untracked manual" per CLAUDE.md's rules.
- **Filter on salary band**: schema is `salary_min`/`salary_max numeric` — the existing "$200k+" chip needs to be defined as `salary_max >= 200000` (or min) — confirm with Lauren which side gates.
- **Detail-page Plan gating**: direct URL access to a Tier 3 job by a free user must redirect or 404 — handled in the server component, not just hidden in UI.
- **No automated tests**: regression risk on the dashboard/resume flow if shared components are touched; keep changes to job-board surface area.
- **Sprint creep**: adding the candidate pipeline pulls `applications` writes from S4 into S2. Estimate +2–3 days vs. job-board-only. If we hit unexpected RLS friction on `applications`, consider deferring the pipeline kanban back to S4 and shipping just the job board.
- **No employer/agency view of applications yet**: candidates may express interest but in S2 only Lauren sees it (via Supabase Studio). The success path requires her to actually check the DB — flag this to her before launch or wire a daily Loops digest.
