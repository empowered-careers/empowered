# Candidate Pipeline — Express Interest + Self-View Kanban

> Last updated: 2026-05-20
> Status: ✅ Shipped 2026-05-20. Archived to `docs/done/`. Migration: `20260520030000_applications_candidate_rls.sql`. Admin-side kanban (`/admin/applications`) is still owed by `docs/ec-admin-super-plan.md` slice 2.
> Sibling of: `docs/done/ec-job-board-plan.md` — depends on its `JobCard` component, `queryKeys.jobs`, and seeded jobs landing first.
> Related:
>
> - `docs/ec-admin-super-plan.md` — provides `is_admin()` helper + Lauren's admin pipeline kanban (slice 2). The admin kanban (`/admin/applications`) is the _other_ side of this candidate-facing view; together they form the closed loop.
> - `docs/ec-admin-recruiters-plan.md` — owns the decision that employers see full candidate PII at expression-of-interest time. **This plan must surface PII consent copy in the Express Interest confirmation.** That decision applies even before the agency portal ships, because Lauren herself can see the candidate's profile via admin.
> - `docs/ec-events-growth-plan.md` — event-sourced candidates have their own `lead.converted` welcome sequence. Don't fire generic onboarding nudges on top of that when they first express interest.

## Context

`ec-job-board-plan.md` ships the candidate-facing job board and lets Lauren seed Tier 1 roles. The natural next step — pulled forward from Sprint 4 (E4) and Sprint 6 (E6) — is to let a candidate **express interest** on a role and see all their expressed interests on a personal kanban (`/pipeline`). The `/pipeline` route is already stubbed in `src/app/(app)/` but empty.

This is split from the job-board plan because:

1. It pulls `applications` table writes + the express-interest CTA from S4 into S2 — a clear scope expansion that can be shelved if RLS friction shows up.
2. The job board alone is sufficient to hit S2's exit criterion ("candidate sees Tier 1 roles"). The pipeline kanban is value-add, not a gate.
3. The two ship independently against the same `JobCard`; coordinating via component composition rather than coupling the plans.

In S2 only the candidate-facing path is wired. Lauren still updates other application statuses via Supabase Studio until `ec-admin-super-plan.md` slice 2 (`/admin/applications` kanban) ships in Sprint 6.

---

## Decisions

- **Express Interest CTA**: rendered on each `JobCard` (from the job-board plan) and on `/job-board/[id]`. Idempotent — clicking again on an existing application is a no-op. The button label reflects current state: "Express interest" → "Interested ✓" once an application row exists.
- **PII consent copy** (from `ec-admin-recruiters-plan.md`): the confirmation UI before insert must state _"Your full profile — name, email, resume, assessment results — will be shared with the hiring company."_ Mirror exact wording from the agency plan so candidates see the same disclosure regardless of which surface triggers it.
- **Candidate kanban at `/pipeline`**: columns mirror the `application_status` enum (`interested`, `submitted`, `screening`, `interviewing`, `offer`, `placed`, `rejected`, `withdrawn`). Candidate can only self-move into `interested` (via Express Interest) or `withdrawn` (self-service). Lauren / employers update the other statuses; updates show up on the candidate's view via realtime.
- **Realtime hook**: a new `useApplicationNotifications` mounted in `src/components/providers/realtime-notifications.tsx` next to `useResumeNotifications` and `useLinkedinNotifications`. Subscribes to `applications` filtered by `profile_id=eq.${userId}`. Fires a Sonner toast on status moves into `screening` / `interviewing` / `offer` / `placed`.

---

## Scope

### In scope

1. Migration: `applications` candidate-facing RLS — read self, insert self at `status='interested'`, update self only to `withdrawn`. Realtime publication + `REPLICA IDENTITY FULL` on `applications`. (Admin + employer policies on `applications` are owned by admin-super and admin-agency respectively.)
2. Server actions: `expressInterest(jobId)`, `withdrawApplication(applicationId)` in `src/app/actions/jobs.ts`. Both gated by RLS, not just app logic.
3. Extend `JobCard` (created by the job-board plan) to render the Express Interest button. State driven by whether an `applications` row exists for this user + job.
4. Extend `/job-board/[id]` page to fetch the user's existing application (if any) and render the same button with PII-consent confirmation modal.
5. `/pipeline` server component: fetch the user's `applications` joined to `jobs`; group by status; pass to client.
6. `/pipeline` client kanban: column per `application_status` enum value; cards show job title, company, posted date, status pill. Drag/drop is **not** required — the only self-move is `interested → withdrawn`, which is a button on the card.
7. `useApplicationNotifications` realtime hook + mount in `realtime-notifications.tsx`.
8. `queryKeys.applications` (`forUser(userId)`, `detail(id)`) added to `src/lib/query-keys.ts`.
9. Extend `/job-board` server fetch to also load the user's existing application IDs (or a `Set<jobId>`) so the board can render correct button state on first paint.

### Out of scope (deferred — owned elsewhere)

- Admin pipeline kanban (`/admin/applications`) — owned by `ec-admin-super-plan.md` slice 2 (S6). Until that ships, Lauren updates statuses via Supabase Studio.
- Employer's ability to advance status — owned by `ec-admin-recruiters-plan.md` (P2-1).
- Match score on the candidate's pipeline cards (S4).
- `applications.status_log` audit trail beyond what RLS records — owned by admin-super.
- Loops `candidate.job_interest` / `candidate.application_status_changed` events — owned by `ec-dev-plan.md` S8.
- Mark-as-placed flow (writes `placements` + optional `commissions`) — owned by admin-super.

---

## Files to create

| Path                                                      | Purpose                                                                                                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/<ts>_applications_candidate_rls.sql` | Candidate-facing RLS on `applications` (read self, insert as `interested`, self-update only to `withdrawn`) + realtime publication. Admin/employer policies live in admin-super and admin-agency. |
| `src/app/(app)/pipeline/page.tsx`                         | Candidate pipeline server component: fetch the user's `applications` joined to `jobs`; group by status; pass to client                                                                            |
| `src/components/pipeline/pipeline-client.tsx`             | Kanban UI: one column per application_status enum value; renders `PipelineCard`s in the matching column                                                                                           |
| `src/components/pipeline/pipeline-card.tsx`               | Application card (job title, company, posted date, status pill, withdraw button when applicable)                                                                                                  |
| `src/components/job-board/express-interest-button.tsx`    | Client component: button + consent confirmation modal. Calls `expressInterest` server action.                                                                                                     |
| `src/hooks/useApplicationNotifications.ts`                | Realtime subscription on `applications` filtered by `profile_id=eq.${userId}`; toast on status moves                                                                                              |

## Files to modify

| Path                                                  | Change                                                                                                                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/actions/jobs.ts`                             | Add `expressInterest(jobId)` and `withdrawApplication(applicationId)` server actions alongside the job-board plan's actions. Revalidate `/job-board`, `/job-board/[id]`, `/pipeline`. |
| `src/app/(app)/job-board/page.tsx`                    | Also fetch the user's existing application IDs (as a `Set<jobId>`); pass through to client so cards know their button state                                                           |
| `src/app/(app)/job-board/[id]/page.tsx`               | Also fetch the user's application for this job (if any); render `ExpressInterestButton` with correct state                                                                            |
| `src/components/job-board/job-card.tsx`               | Accept an `applicationStatus?: 'interested' \| ...` prop; render the `ExpressInterestButton` next to the bookmark                                                                     |
| `src/components/job-board/job-board-client.tsx`       | Thread the `Set<jobId>` of existing applications down to each `JobCard`                                                                                                               |
| `src/lib/query-keys.ts`                               | Add `queryKeys.applications` (`forUser(userId)`, `detail(id)`)                                                                                                                        |
| `src/components/providers/realtime-notifications.tsx` | Mount `useApplicationNotifications` alongside existing resume + linkedin notification hooks                                                                                           |
| `src/components/app-shell/sidebar-config.ts`          | Wire the existing `/pipeline` sidebar entry to actually link to `/pipeline` (it may already be stubbed)                                                                               |
| `src/types/database.types.ts`                         | Regenerate via `npm run supabase:types` after the migration                                                                                                                           |
| `docs/ec-dev-plan.md`                                 | Tick the pulled-forward S4/S6 checkboxes covered by this plan                                                                                                                         |
| `docs/db_schema.md`                                   | Document the candidate-facing `applications` RLS posture                                                                                                                              |
| `docs/todo.md`                                        | Update live checklist                                                                                                                                                                 |

---

## Patterns to reuse (don't reinvent)

- **Realtime hook shape**: copy `src/hooks/useResumeNotifications.ts` / `useLinkedinNotifications.ts` — `postgres_changes` filtered by `profile_id=eq.${userId}`, `supabase.removeChannel(channel)` on unmount, Sonner toast with action button.
- **Server-component initialData fetch**: mirror `src/app/(app)/dashboard/page.tsx` — `Promise.all` parallel fetches, `redirect('/login')` if unauthed.
- **Server actions**: same shape as the job-board plan — `'use server'`, `createServerClient`, `revalidatePath`, return `{ ok, error }`.
- **Consent modal**: shadcn `Dialog`, opened via the global `ModalProvider` (`src/components/providers/modal-provider.tsx`).

---

## Migration details (rough SQL shape — not final)

> Prerequisites: role enum from `ec-admin-super-plan.md` and the job-board migrations from `ec-job-board-plan.md` must both have landed.

```sql
-- applications candidate-facing RLS only (admin + employer policies live in admin-super / admin-agency)
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

Note: when admin-super and admin-agency ship their RLS additions, the policies stack additively (Postgres OR-combines policies for the same role). Verify no naming collisions: this plan uses `applications_read_self`, `applications_insert_self`, `applications_update_self_withdraw`. Admin-super uses `applications_admin_all`. Admin-agency uses `applications_read_employer` / `applications_update_employer`.

---

## Verification

Manual end-to-end (no automated tests in this repo):

1. **Type safety**: `npm run type-check` clean after migration + `npm run supabase:types`.
2. **Lint**: `npm run check` clean.
3. **Express Interest happy path**:
   - Sign in as a `plan='free'` test user with at least one Tier 1 job seeded (from job-board plan).
   - Visit `/job-board`. Each card shows "Express interest" button next to bookmark.
   - Click on a card → consent modal appears with the exact PII copy from `ec-admin-recruiters-plan.md`.
   - Confirm → `applications` row created with `profile_id=user, job_id=job, status='interested'`. Button updates to "Interested ✓". Toast fires.
   - Click again on the same card → no-op (or shows "already interested" — idempotent).
4. **Detail-page parity**:
   - Visit `/job-board/[id]` for the same job → button reads "Interested ✓". Click → no-op.
   - Visit `/job-board/[id]` for a different job → "Express interest" → consent modal → insert works the same way.
5. **`/pipeline` kanban**:
   - Visit `/pipeline` → see one card in the "Interested" column for the job above. Other columns empty.
6. **Realtime status moves**:
   - In Supabase Studio, manually `update applications set status='screening' where id=<row>;`.
   - Within ~1s the `/pipeline` kanban shifts the card to the Screening column and a Sonner toast fires ("Lauren moved you to Screening for [Job Title]").
7. **Self-withdraw**:
   - Click "Withdraw" on a card in the kanban → row updates to `status='withdrawn'`, card moves to Withdrawn column. Toast fires.
8. **RLS adversarial**:
   - As user A, attempt `select * from applications where profile_id != auth.uid()` via Supabase Studio with their JWT → blocked.
   - As user A, attempt `update applications set status='offer' where id=<own row>` → blocked (status not in self-update allowlist).
   - As user A, attempt `insert into applications(profile_id, job_id, status) values (user_b_id, ..., 'interested')` → blocked.
9. **Job-board first-paint correctness**:
   - User A expresses interest on Job 1. Sign out, sign back in, visit `/job-board` → Job 1's card shows "Interested ✓" on first paint (no client-side flash). Confirms the server-fetched `Set<jobId>` is correctly threaded.

---

## Risks / open items

- **Order with job-board plan**: this plan extends `JobCard`. If both plans are built sequentially, job-board first → pipeline second, the `JobCard` props shape needs to be future-proofed in job-board (mentioned in that plan's risks). If the two are built by the same engineer in one stretch, treat the `JobCard` shape as joint.
- **Consent copy ownership**: the PII disclosure wording is defined in `ec-admin-recruiters-plan.md`. If that wording changes, this plan must follow. Don't fork the copy.
- **Loops noise**: when admin-super slice 2 (`useAdminApplicationNotifications`) ships and admin-agency adds employer-driven status moves, three different observers (candidate, admin, employer) react to `applications` changes. Currently only the candidate hook exists; verify no double-toast happens once others land.
- **`applications.status` enum drift**: if S4 adds new statuses (e.g. `offer_accepted`), the `/pipeline` kanban columns and the candidate-self-withdraw policy must be updated in lockstep. Treat the enum as load-bearing.
- **Fallback shelf**: if `applications` RLS friction shows up during implementation, this plan can shelve cleanly back to S4 without affecting `ec-job-board-plan.md`. The board ships, Express Interest waits.
- **No automated tests**: regression risk on the job-board flow when extending `JobCard` and `job-board/page.tsx`. Manual walkthrough of the job-board plan's verification steps is part of this plan's exit criteria too.
