# Candidate preferences + onboarding capture (shipped)

> Shipped: 2026-05-22
> Status: live on `main`. Migration `20260522000000_candidate_preferences.sql`.
> Source plan: `C:\Users\pooja\.claude\plans\partitioned-purring-journal.md`
> Related: `docs/done/ec-job-board-plan.md` (express-interest CTA — extended here), `docs/done/ec-admin-super-plan.md` (role enum + `is_admin()` helper this RLS depends on), `docs/ec-admin-recruiters-plan.md` (Phase 2 employer view — full PII on expressions of interest is the reason for capturing Tier B at peak intent).

## Why this exists

Before this sprint the platform captured identity (OAuth), resume content, LinkedIn data, and assessment scores — but **no statements of intent**. Matching, Lauren's outreach prioritization, the Loops nudge cadence, and the future employer portal all needed: target role, industry, urgency, notice period, work authorization, salary expectations, location preference, target companies.

Resume parsing already extracts `current_title`, `seniority_level`, `total_years_exp` (in `resumes.parsed_json`), but those are observations of the past, not statements of intent.

---

## What landed

### Schema

`supabase/migrations/20260522000000_candidate_preferences.sql`:

- Three enums: `switch_urgency` (`actively_looking` / `open` / `passive` / `not_looking`), `work_auth` (`us_citizen` / `us_permanent_resident` / `us_visa_needed` / `eu_citizen` / `other`), `remote_preference` (`remote` / `hybrid` / `onsite` / `flexible`).
- Table `candidate_preferences` — one row per profile, keyed `unique(profile_id)`. See `docs/db_schema.md` for the full column list.
- RLS: `candidate_preferences_self` (`profile_id = auth.uid()` for all ops) + `candidate_preferences_admin` overlay (`is_admin()`).

`profiles.onboarding_completed_at` (column already existed since S1, never previously written to) is what flips the soft gate off.

### Three-tier capture model

- **Tier A — required at onboarding** (`target_role`, `target_seniority`, `industries`, `switch_urgency`, `notice_period_days`, `work_authorization`). Without these matching cannot function.
- **Tier B — first Express Interest** (`expected_salary_min_cents`, `expected_salary_max_cents`, `current_location`, `remote_preference`). Captured once at peak intent, never asked again.
- **Tier C — optional, editable anytime** on `/profile` (`current_salary_cents`, `willing_to_relocate`, `target_companies`, `blocklist_companies`, `preferred_domains`).

### Onboarding flow (soft gate)

- OAuth callback unchanged.
- `/dashboard` renders a yellow banner ("Complete your profile to unlock matches — takes 90 seconds") when `onboarding_completed_at IS NULL`.
- `/onboarding/preferences` is a single-page form. `target_seniority` is pre-filled from the latest `is_current` resume's `seniority_level` when available.
- `completeOnboarding` server action upserts the prefs row, stamps `profiles.onboarding_completed_at`, redirects to `/dashboard`.
- **Hard route guard**: `/job-board` and `/job-board/[id]` redirect to `/onboarding/preferences` until the stamp is set. Resume, LinkedIn, dashboard, and pipeline routes stay open.
- Profile-strength card has 6 steps now (was 5); `getProfileStrength()` keys the new step on `onboarding_completed_at`.

### First Express Interest prompt

- `/job-board` and `/job-board/[id]` fetch the Tier B subset and compute a `needsExpressInterestPrefs` boolean.
- `ExpressInterestButton` accepts that as a prop; when true the consent modal prepends `ExpressInterestPrefsStep` (salary min/max in $k, location, remote preference).
- On confirm: `saveExpressInterestPrefs` first (saves Tier B fields), then the existing `expressInterest` action. Subsequent applications find the fields filled → step is skipped → modal behaves exactly as before.

### `/profile` — canonical edit surface

New route under the `(app)` group. Server component fetches profile identity + preferences, passes to client. Sections:

1. **Identity** — read-only OAuth fields (name, email), phone, LinkedIn URL.
2. **Job preferences** — Tier A inline-edit. Editing here never re-triggers the gate; once `onboarding_completed_at` is set it stays set.
3. **Comp & location** — Tier B + `current_salary_cents` + `willing_to_relocate`.
4. **Companies** — text-chip multi-add for `target_companies` and `blocklist_companies`. Blocklist annotated "Never shown to employers."

Sidebar `My Profile` entry rerouted from `/dashboard` to `/profile`. `resolveTabKey` maps `/profile` and `/onboarding` paths to the Dashboard tab.

---

## Files

### Created

| Path                                                           | Purpose                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `supabase/migrations/20260522000000_candidate_preferences.sql` | Table + enums + RLS                                                       |
| `src/app/(app)/onboarding/preferences/page.tsx`                | Server entry; reads existing prefs + latest resume for seniority pre-fill |
| `src/components/onboarding/preferences-form.tsx`               | Tier A client form                                                        |
| `src/app/(app)/profile/page.tsx`                               | Canonical edit surface                                                    |
| `src/components/profile/profile-client.tsx`                    | Section composition                                                       |
| `src/components/profile/section-shell.tsx`                     | Card wrapper used by all sections                                         |
| `src/components/profile/identity-section.tsx`                  | Read-only identity rows                                                   |
| `src/components/profile/preferences-section.tsx`               | Tier A editor                                                             |
| `src/components/profile/comp-location-section.tsx`             | Tier B + current_salary + relocate                                        |
| `src/components/profile/target-companies-section.tsx`          | Chip inputs                                                               |
| `src/components/job-board/express-interest-prefs-step.tsx`     | One-screen Tier B prompt mounted inside the consent modal                 |
| `src/app/actions/preferences.ts`                               | `completeOnboarding`, `updatePreferences`, `saveExpressInterestPrefs`     |

### Modified

| Path                                                   | Change                                                                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `src/types/database.types.ts`                          | Added `candidate_preferences` Row/Insert/Update + 3 enums + Constants entries                            |
| `src/types/db.ts`                                      | Added `CandidatePreferencesRow/Insert/Update`, `SwitchUrgency`, `WorkAuth`, `RemotePreference` aliases   |
| `src/lib/query-keys.ts`                                | Added `queryKeys.preferences.detail(userId)`                                                             |
| `src/hooks/use-dashboard-data.ts`                      | `DashboardProfile` gained `onboarding_completed_at`; `getProfileStrength()` now 6 steps                  |
| `src/app/(app)/dashboard/page.tsx`                     | Profile select now includes `onboarding_completed_at`                                                    |
| `src/app/(app)/layout.tsx`                             | Same                                                                                                     |
| `src/components/dashboard/dashboard-client.tsx`        | Renders the onboarding banner when stamp is null                                                         |
| `src/components/dashboard/profile-strength-card.tsx`   | Adds Job preferences step + router.push to `/onboarding/preferences`                                     |
| `src/app/(app)/job-board/page.tsx`                     | Server-side onboarding redirect + Tier B fetch + `needsExpressInterestPrefs` flag passed down            |
| `src/app/(app)/job-board/[id]/page.tsx`                | Same on the detail page                                                                                  |
| `src/components/job-board/job-board-client.tsx`        | Threads `needsExpressInterestPrefs` to cards                                                             |
| `src/components/job-board/job-card.tsx`                | Same                                                                                                     |
| `src/components/job-board/express-interest-button.tsx` | Accepts `needsPrefs`; mounts the Tier B step + calls `saveExpressInterestPrefs` before `expressInterest` |
| `src/components/app-shell/sidebar-config.ts`           | `My Profile` → `/profile`; `resolveTabKey` maps `/profile` + `/onboarding` to Dashboard                  |
| `docs/db_schema.md`                                    | Documents `candidate_preferences` + 3 new enums                                                          |
| `docs/ec-dev-plan.md`                                  | Notes the ship under the S2 progress section                                                             |

---

## Patterns reused

- **1:1 child table** — `candidate_scores` is the template (`unique(profile_id)`, self-RLS keyed on `profile_id = auth.uid()`).
- **Self + admin policy stacking** — same shape as `applications_admin_all` from `20260520040000_admin_rls.sql`.
- **Server/Client split with `initialData`** — `/profile/page.tsx` server fetches and passes to `ProfileClient`.
- **Soft-gate banner** — yellow banner + per-route redirect; pipeline/resume/LinkedIn stay open so the candidate isn't dead-ended.
- **Modal step extension** — same `Dialog` primitive used by the LinkedIn URL flow in `profile-strength-card`.
- **`db.ts` aliases** — per CLAUDE.md, every new enum/row type is exported from `db.ts` before any call site imports it.

---

## Out of scope (deferred — flag if these come up)

- **Resume → industry inference**. Extending `ParsedResumeSchema` to infer industries from work history. Held until a stable industry taxonomy exists; today candidates self-select multi-text. Only `target_seniority` is pre-filled from the resume.
- **Target companies keyed index**. User-flagged future work. Today: free-text array on the prefs row.
- **Matching algorithm changes**. This sprint captures the inputs only. Match score v1 in S4 (`docs/ec-dev-plan.md`) is where these fields plug into scoring + filters.
- **Employer-side filtering on prefs**. Phase 2 in `docs/ec-admin-recruiters-plan.md`.
- **Lauren's admin view of preferences**. RLS already lets admins read everything; UI in `/admin/candidates/[id]` does not yet surface the prefs row. Add a `Preferences` section there if Lauren asks.

---

## Verification (recorded for next session)

`npm run type-check` + `npm run check` clean (only pre-existing warnings unrelated to this change).

Manual flow (run after applying the migration):

1. Sign in as a fresh candidate → banner on `/dashboard`.
2. Click "Start" → `/onboarding/preferences`. If a resume was already uploaded, `target_seniority` is pre-filled.
3. Submit → banner gone, profile-strength % bumped, `candidate_preferences` row exists, `profiles.onboarding_completed_at` non-null.
4. Visit `/job-board` before completion → redirects to `/onboarding/preferences`. After completion → renders normally.
5. Express interest on a Tier 1 role → modal shows the Tier B prefs step. Fill + confirm → `applications` row at `interested` + Tier B fields on the prefs row.
6. Express interest on a second role → modal opens straight to PII consent. No Tier B step.
7. Visit `/profile` → all sections render; inline edits persist.
8. Adversarial RLS: candidate B can't read or update candidate A's prefs row.
9. Onboarding stamp is sticky — editing on `/profile` never re-triggers the gate.
