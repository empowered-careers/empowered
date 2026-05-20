# Sprint 2 — Job Board (E4 Pulled Forward)

> Last updated: 2026-05-20
> Status: ✅ Shipped 2026-05-20. Archived to `docs/done/`. Migrations: `20260520010000_jobs_rls_and_tier_fn.sql`, `20260520020000_saved_jobs.sql`. Open item: Lauren confirms `salary_max >= 200000` is the right gate for the "$200k+" chip (vs. `salary_min`).
> Related:
>
> - `docs/ec-admin-super-plan.md` — authoritative for role/auth model (`profiles.role` enum, `is_admin()` helper) and admin layout/sidebar shell. (Phase 0 of that plan shipped alongside this one.)
> - `docs/done/ec-candidate-pipeline-plan.md` — sibling plan; adds Express Interest CTA on top of this board's `JobCard` and ships the `/pipeline` kanban. Plan B depends on this plan's `JobCard`, `queryKeys.jobs`, and seeded jobs. Also shipped 2026-05-20.
> - `docs/ec-admin-recruiters-plan.md` — Phase 2; when an employer can see candidates, the Express Interest action in Plan B must surface PII consent copy. Not needed in this plan.

## Context

Sprint 2's exit criterion requires "a real candidate signs up, uploads resume, sees their ATS score, sees Job Tier 1 roles." The job board route shell exists (`src/app/(app)/job-board/`) but renders hardcoded mock data — no Supabase fetch, no Plan-gating, no way for Lauren to add roles.

We're prioritizing the job board over Stripe (S3) because:

1. The paywall has nothing to gate until the board exists with lock states wired to `profiles.plan`.
2. Final tier pricing is still being decided — Stripe work would block on that anyway.
3. Lauren can curate Tier 1 in parallel while the board is being built.

This plan covers the **candidate-facing display board** + **Save-for-later bookmarking** + **`/admin/jobs` CRUD** so Lauren can seed Tier 1 herself. Express Interest, the `applications` table, and the `/pipeline` kanban are split into a sibling plan (`ec-candidate-pipeline-plan.md`) so this one can ship independently and Stripe (S3) can layer on top.

---

## Decisions

- **Seeding**: minimal `/admin/jobs` form in S2 (not pure SQL) — pays off long-term, unblocks Lauren without engineer involvement.
- **Lock state UX**: Tier 2 and Tier 3 each render a locked banner showing live count of active roles + a CTA toward the relevant Plan upgrade. Matches `ec-ui-plan.md` Tab 3.
- **Card interactivity**: view + Save-for-later bookmark + dedicated detail page at `/job-board/[id]`. The Express Interest button is added on top of `JobCard` by `ec-candidate-pipeline-plan.md` — not in this plan.
- **Filters**: wire all three chip groups (Tier, Remote policy, salary band) client-side over the fetched dataset.
- **Admin auth**: owned by `ec-admin-super-plan.md` — `profiles.role` enum (`candidate`/`admin`/`employer`) + `is_admin()` / `is_employer()` / `current_employer_id()` helper functions. This plan reuses those; no boolean column is introduced. Lauren's row is promoted via SQL once after the role migration ships. Admin layout + sidebar shell also come from admin-super.

---

## Scope

### In scope

1. Migration: RLS policies on `jobs` (read: authenticated; write: `is_admin()` — helper from admin-super) + seed system employer row + `can_see_job_tier(plan, job_tier)` SQL function.
2. Migration: `saved_jobs` table (profile_id, job_id, created_at) + RLS (self-only).
3. Server fetch of jobs on `/job-board` page; pass to client with initialData hydration pattern.
4. Client board with real data: Tier 1 grid + Tier 2/3 locked banners with live counts.
5. Filter logic (tier, remote_policy, salary_min) over fetched dataset.
6. Save-for-later bookmark toggle on each card; wired to `saved_jobs`.
7. Sidebar "Saved roles" entry → `/job-board/saved` route showing bookmarked jobs.
8. Job detail page `/job-board/[id]` (server component, RLS-respecting; honors Plan gating).
9. `/admin/jobs` list + create + edit pages — slot into the admin shell + role guard provided by admin-super (do **not** re-implement the layout/guard here).
10. Plan-gating helper `src/lib/plan.ts` with `canSeeJobTier(plan, tier)` matching the Postgres function for client reuse.
11. `queryKeys.jobs` added to `src/lib/query-keys.ts`.
12. Seed: one system employer row "Empowered Careers / Curated" so `jobs.submitted_by` FK holds for Lauren's roles.

### Out of scope (deferred — owned elsewhere)

- Role enum, `is_admin()` / `is_employer()` helpers, admin layout/sidebar/overview — owned by `ec-admin-super-plan.md` and land first.
- Express Interest CTA, `applications` RLS, `/pipeline` candidate kanban, withdraw action, application realtime hook — owned by `ec-candidate-pipeline-plan.md` (sibling plan, ships after this one).
- Match score per card (S4 — needs `matches` rows + scoring algorithm).
- "Why this matches you" reasoning (S4).
- Lauren's admin pipeline view / kanban (S6 — owned by admin-super slice 2).
- Stripe-driven Plan upgrades (S3).
- Tier 2/3 unlock by assessments (S5 — for now Tier 2/3 stay locked for everyone except `plan_3`).

---

## Files to create

| Path                                                | Purpose                                                                                                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `supabase/migrations/<ts>_jobs_rls_and_tier_fn.sql` | RLS on `jobs` (read all auth; write via `is_admin()`); seed system employer; `can_see_job_tier(plan, job_tier)` SQL function. Depends on role enum migration from admin-super. |
| `supabase/migrations/<ts>_saved_jobs.sql`           | `saved_jobs` table + RLS (self-only read/write)                                                                                                                                |
| `src/lib/plan.ts`                                   | `canSeeJobTier(plan, tier)` + tier→required-plan mapping for CTAs                                                                                                              |
| `src/app/actions/jobs.ts`                           | Server actions: `createJob`, `updateJob`, `archiveJob`, `toggleSavedJob`                                                                                                       |
| `src/app/(app)/job-board/[id]/page.tsx`             | Job detail server component; redirects if Plan can't see tier                                                                                                                  |
| `src/app/(app)/job-board/saved/page.tsx`            | Saved-jobs list server component                                                                                                                                               |
| `src/app/admin/jobs/page.tsx`                       | Admin jobs list + create form (server). Admin layout/guard ships with admin-super, not here.                                                                                   |
| `src/app/admin/jobs/[id]/edit/page.tsx`             | Admin edit form                                                                                                                                                                |
| `src/components/job-board/job-card.tsx`             | Extracted reusable card with bookmark toggle. **The Express Interest button is added by `ec-candidate-pipeline-plan.md` as a follow-up edit.**                                 |
| `src/components/job-board/tier-locked-banner.tsx`   | Banner for locked Tier 2/3 with count + CTA                                                                                                                                    |
| `src/components/admin/job-form.tsx`                 | Client form for create/edit                                                                                                                                                    |

## Files to modify

| Path                                            | Change                                                                                                                                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/(app)/job-board/page.tsx`              | Convert to real server component: parallel fetch of jobs by tier + saved-job IDs + profile.plan; pass initialData to client. (Pipeline plan extends this to also fetch the user's applications.) |
| `src/components/job-board/job-board-client.tsx` | Replace mock JOBS const with props; wire filters; render tier-locked banners using `canSeeJobTier`; integrate `JobCard` + bookmark                                                               |
| `src/lib/query-keys.ts`                         | Add `queryKeys.jobs` (`all`, `byTier(tier)`, `detail(id)`, `saved(userId)`)                                                                                                                      |
| `src/components/app-shell/sidebar-config.ts`    | Set `/job-board/saved` href on "Saved roles". (The admin sidebar section + role gating is owned by admin-super.)                                                                                 |
| `src/types/database.types.ts`                   | Regenerate via `npm run supabase:types` after migrations                                                                                                                                         |
| `docs/ec-dev-plan.md`                           | Tick Sprint 2 job-board checkboxes once landed                                                                                                                                                   |
| `docs/db_schema.md`                             | Document `saved_jobs` table                                                                                                                                                                      |
| `docs/todo.md`                                  | Update live checklist                                                                                                                                                                            |

---

## Patterns to reuse (don't reinvent)

- **Server/Client split with initialData**: mirror `src/app/(app)/dashboard/page.tsx` (parallel `Promise.all` fetches, auth guard with `redirect('/login')`, pass to client). See `dashboard-client.tsx` for the props-shape convention.
- **Server actions**: mirror `src/app/actions/resume.ts` style — `'use server'`, `createServerClient` from `src/lib/supabase/server.ts`, `revalidatePath` after mutation, return `{ ok, error }` shape.
- **Query key structure**: nested namespace like the existing `posts.detail(id)` in `src/lib/query-keys.ts`.
- **Sidebar nav**: entries already drafted in `src/components/app-shell/sidebar-config.ts:79-96` — just fill hrefs.

---

## Migration details (rough SQL shape — not final)

> Prerequisite: the role-enum migration from `ec-admin-super-plan.md` must land first so `is_admin()` exists.

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

-- jobs RLS (reuses is_admin() from admin-super)
alter table jobs enable row level security;
create policy jobs_read_auth on jobs for select to authenticated using (true);
create policy jobs_write_admin on jobs for all to authenticated
  using (is_admin()) with check (is_admin());

-- system employer for Lauren-curated roles
insert into employers (id, name, relationship_type) values
  ('00000000-0000-0000-0000-000000000001', 'Empowered Careers / Curated', 'direct_client')
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
```

Note: `jobs` already exists from S1 migration; we're only adding RLS policies. Verify no policies already conflict before applying. The `jobs_write_owner_employer` policy is added by `ec-admin-recruiters-plan.md` — don't duplicate.

---

## Verification

Manual end-to-end (no automated tests in this repo):

1. **Type safety**: `npm run type-check` clean after migrations + `npm run supabase:types`.
2. **Lint**: `npm run check` clean.
3. **Admin path** (requires admin-super role enum + admin layout to be live first):
   - Set `role = 'admin'` on Lauren's profile via SQL.
   - Visit `/admin/jobs` → form loads (guard provided by admin-super layout). Non-admin user redirects.
   - Create 12 Tier 1 jobs via the form. Confirm they land in `jobs` with `submitted_by` = system employer.
4. **Free candidate flow**:
   - Sign in as a `plan = 'free'` test user.
   - Visit `/job-board` → see all 12 Tier 1 cards. Tier 2 and Tier 3 sections show locked banners with counts (0 each initially; add one Tier 2 + one Tier 3 via admin to verify counts increment).
   - Filter chips: toggle Tier 1 / Remote / $200k+ → grid updates.
   - Click a card → `/job-board/[id]` loads description, requirements, salary band.
   - Bookmark a card → `saved_jobs` row created. Sidebar "Saved roles" → `/job-board/saved` lists it. Unbookmark removes it.
5. **Plan_3 user**:
   - Manually set `plan = 'plan_3'` on a test profile via SQL.
   - Refresh `/job-board` → Tier 2 and Tier 3 cards now render fully (no locked banner).
6. **RLS sanity**:
   - As non-admin, attempt `insert into jobs` via Supabase Studio SQL with that user's JWT → blocked.
   - As user A, try to read user B's `saved_jobs` → blocked.
7. **Dev server**: `npm run dev`, walk the journey signed-out → signed-in → `/job-board` → detail → bookmark → saved. Watch console for errors.

---

## Risks / open items

- **Dependency on admin-super**: this plan can't ship until `ec-admin-super-plan.md` slice 1 (role enum + helpers + admin layout) has landed. If admin-super slips, fall back to a temporary inline check in the jobs RLS policy and revisit later — but don't reintroduce a boolean column.
- **`jobs` may already have RLS policies from S1**: confirm in migration files before adding new ones; reconcile if conflicting.
- **`saved_jobs` is new schema** not in `docs/db_schema.md`; doc update needed alongside migration so it's not "untracked manual" per CLAUDE.md's rules.
- **Filter on salary band**: schema is `salary_min`/`salary_max numeric` — the existing "$200k+" chip needs to be defined as `salary_max >= 200000` (or min) — confirm with Lauren which side gates.
- **Detail-page Plan gating**: direct URL access to a Tier 3 job by a free user must redirect or 404 — handled in the server component, not just hidden in UI.
- **JobCard handoff**: the pipeline plan extends `JobCard` to add the Express Interest button. Keep the component's props shape easy to extend (don't tightly couple the bookmark logic) so the follow-up edit is small.
- **No automated tests**: regression risk on the dashboard/resume flow if shared components are touched; keep changes to job-board surface area.
