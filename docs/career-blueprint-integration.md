# Career Identity Blueprint™ — In-App Integration Plan

> Status: Planned (approved). Implementation pending.
> Scope: Deliverable 1 — the authenticated, in-app assessment for signed-up candidates.
> Companion: `docs/career-blueprint-lead-magnet.md` (future public funnel — do not build yet).

---

## 1. Context & Goal

`docs/prototypes/career-identity-blueprint.html` is a complete, working prototype of a **30-question
Career Identity Blueprint™** scan. Its scoring is deterministic client-side JavaScript that
renders a rich results page: Career Archetype, Leadership Style, Company Fit, Executive
Personality Dimensions, Career Symmetry Score, Green/Red-Light energy, Communication Style,
Burnout meter, and Interview / Career-Search / LinkedIn guidance. `docs/assessment.md` is the
full IP/brand spec behind it (the broader ecosystem, premium Deep Dive, archetype copy).

Today, **assessments are not started** (Sprint E5 in `docs/ec-dev-plan.md`). The schema has
placeholder tables (`assessments`, `assessment_responses`, `candidate_scores`) but no runner,
scoring, or journey wiring.

The original docs (`ec-feature-list.md` §6, `ec-candidate-journey.md` Stage 4) describe **five
separate progressive assessments**. The Blueprint is the **first assessment in that planned
suite** — not a replacement for it. For Phase 1 the Blueprint alone populates all five
`candidate_scores` dimensions in a single run; the granular per-dimension assessments remain on
the roadmap to layer in later. ("Blueprint now, the rest later.")

**Goal:** A signed-up candidate takes the Blueprint from the dashboard, gets an instant,
identity-forming result (the virality hook — _"I'm a Visionary Builder™"_), has it persisted
to their profile, feeds the five `candidate_scores` dimensions (improving future match
quality), and is nudged toward coaching / premium upsells.

### Locked decisions

| #   | Decision                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Model:** single 30-Q Blueprint now; its scoring populates all 5 `candidate_scores` dimensions. ("Blueprint now, 5 later.")                                   |
| 2   | **Tier 2 access:** unchanged — `canSeeJobTier()` stays plan-gated. Blueprint is a profile-strength / match-quality / conversion lever, **not** an access gate. |
| 3   | **Surface:** authed-only, inside the `(app)` route group.                                                                                                      |
| 4   | **Lead magnet:** future, separate; only a planning doc now (`career-blueprint-lead-magnet.md`).                                                                |
| 5   | **No question overlap** with onboarding (`candidate_preferences`) or resume/LinkedIn capture.                                                                  |

---

## 2. Overlap Audit (constraint #5)

The Blueprint captures **psychological / style** signal; onboarding captures **logistics**;
resume/LinkedIn capture **skills, experience, keywords**. Confirmed minimal literal overlap:

| Blueprint section (Qs)        | Signal                                                          | Captured elsewhere?                                                                                            | Verdict                                        |
| ----------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Energy & Work Style (1–5)     | how you recharge / what drains you                              | no                                                                                                             | net-new                                        |
| Leadership & Influence (6–10) | leadership archetype                                            | no                                                                                                             | net-new                                        |
| Company Culture Fit (11–15)   | startup / growth / enterprise / mission preference              | `candidate_preferences` has remote / industries / target_companies but **not** company stage/culture           | net-new, complementary                         |
| Energy Audit (16–20)          | green/red-light, burnout                                        | no                                                                                                             | net-new                                        |
| Communication & Brand (21–25) | comm style, online visibility preference                        | LinkedIn grade scores the _current_ profile, not style preference                                              | net-new                                        |
| Career Direction (26–30)      | motivational drivers (impact / financial / freedom / stability) | `candidate_preferences.switch_urgency` = switch _timeline_; `target_role`/`target_seniority` = concrete target | **distinct** (motivation ≠ logistics/timeline) |

**Enforced rules in implementation:**

- The Blueprint **reads but never re-asks** anything onboarding/resume/LinkedIn already store.
- `submitBlueprint` **does not write** to `candidate_preferences`. Motivational answers live
  only in the Blueprint result.
- The runner never asks for target role, seniority, industries, salary, location, or skills.

---

## 3. Data Model

Reuse the existing tables. Add **one migration** under `supabase/migrations/` that:

1. **Seeds one `assessments` row** — name `Career Identity Blueprint`, `question_count` 30,
   with a fixed UUID referenced from app code as `BLUEPRINT_ASSESSMENT_ID`
   (`src/lib/assessment/constants.ts`).
2. **Extends `assessment_responses`** with:
   - `result jsonb` — the full computed result blob (archetype, all cards, spectrums, scores).
   - `archetype text` — denormalized archetype name for fast display / sharing / admin lists.
3. **Unique constraint** `(profile_id, assessment_id)` so retakes **upsert (overwrite)** —
   one row per candidate per assessment, no history. (Add only if not already present.)
4. **RLS:** self read/insert/update keyed on `profile_id = auth.uid()`. The existing admin +
   employer-scoped overlays on `assessment_responses`
   (`20260523000001_employer_rls.sql`) already cover row access; new columns inherit them —
   confirm during build.

After the migration:

- Run `npm run supabase:types`.
- Add aliases to `src/types/db.ts` (never inline `Database[...]` at call sites):
  `AssessmentRow`, `AssessmentResponseRow` / `Insert` / `Update`,
  `CandidateScoresRow` / `Insert` / `Update`.
- Hand-write a `BlueprintResult` type (in `src/lib/assessment/types.ts`) describing the
  `result` jsonb shape (archetype, leadership, companyFit, spectrums[], symmetry[],
  greenLight[], redLight[], commStyle, burnout, interview[], strategy[], linkedin[]).

---

## 4. Scoring Engine (port the prototype; server-side source of truth)

The prototype's scoring is **fully deterministic and instant** — no LLM, no long-running
work. We therefore **do not** use the async Inngest / Realtime job pattern (that is for
resume/LinkedIn LLM work). Submit computes synchronously and returns the result.

New pure-TS modules under `src/lib/assessment/`:

- **`questions.ts`** — the 30 questions + per-option `scores` maps, lifted verbatim from the
  prototype's `QUESTIONS` array. Single source of truth for both the runner UI and scoring.
- **`blueprint.ts`** — port the prototype's logic into typed pure functions:
  - `scoreBlueprint(answers: number[]) → BlueprintResult` — ports `computeResults`,
    `getArchetype`, `getCompanyFit`, `getCommStyle`, `getBurnout`, and the spectrum /
    symmetry / green-red / interview / strategy / linkedin builders.
  - `deriveCandidateScores(rawScores) → { role_clarity_score, values_score, strengths_score,
leadership_score, impact_score, overall_score }` — maps the raw dimension tallies onto the
    five Phase-1 columns. Leave `mindset_score` / `communication_score` **null** (Phase 2,
    per `db_schema.md`). Document the mapping inline so it's auditable.

Keep archetype/result copy in a `content.ts` constant lifted from the prototype + `assessment.md`.

---

## 5. Server Action & Persistence

`src/app/actions/assessment.ts` (new), modeled on `actions/preferences.ts` / `actions/resume.ts`:

```
submitBlueprint(answers):
  1. auth-guard via server Supabase client
  2. result = scoreBlueprint(answers)
  3. upsert assessment_responses
       (profile_id, assessment_id=BLUEPRINT_ASSESSMENT_ID,
        responses=answers, score=result.overall, result, archetype, completed_at=now)
       onConflict (profile_id, assessment_id)
  4. upsert candidate_scores via deriveCandidateScores(...)  onConflict (profile_id)
  5. revalidatePath('/dashboard'), '/profile', '/assessment'
  6. return result   // for instant client render
```

No fire-and-forget POST, no Realtime hook, no entry added to
`components/providers/realtime-notifications.tsx`.

---

## 6. Routing & UI (Server/Client split per CLAUDE.md)

- **`src/app/(app)/assessment/page.tsx`** — Server Component. Auth guard is inherited from
  `(app)/layout.tsx`. Fetches the candidate's existing Blueprint `assessment_responses` row
  (if any) and passes `initialResult` to the client. `noindex` metadata.
- **`src/components/assessment/assessment-client.tsx`** — ports the prototype's four screens
  (welcome → question runner → loading → results) to React + the app's shadcn/Tailwind design
  tokens. **Do not** copy the prototype's inline gold/navy CSS — match the app theme; mirror
  style from `dashboard-client.tsx`, `profile-strength-card.tsx`, and
  `onboarding/preferences-form.tsx`.
  - Local state for `answers` + `step` (mirror prototype `selectOption` / `nextQuestion` /
    `prevQuestion`); progress header.
  - On the final question, call `submitBlueprint` inside a transition; show the (cosmetic)
    loading screen; render results from the returned `BlueprintResult`.
  - If `initialResult` exists, land directly on results with a **Retake** affordance
    (retake overwrites the single row).
- **Result sub-components** under `src/components/assessment/` — small presentational pieces:
  archetype hero, personality spectrums, symmetry bars, green/red tag rows, burnout meter,
  guidance lists.
- Add an `assessment` group to `src/lib/query-keys.ts` for cache consistency.

---

## 7. Journey Wiring

- **Profile strength** (`components/dashboard/profile-strength-card.tsx` `buildSteps` +
  `hooks/use-dashboard-data.ts` `getProfileStrength`): add a step _"Discover your Career
  Identity Blueprint"_, complete when a Blueprint `assessment_responses` row exists; action
  routes to `/assessment`. Thread blueprint-completion into the dashboard server fetch
  (`app/(app)/dashboard/page.tsx`) alongside profile/resumes.
- **Dashboard nudge card** — archetype-driven once complete (e.g. _"You're a Visionary
  Builder™ — see roles that fit"_ / coaching upsell), reusing
  `components/dashboard/quick-actions.tsx` patterns.
- **Profile page** (`app/(app)/profile/page.tsx` → `components/profile/profile-client.tsx`):
  surface the archetype + key result cards read-only. Fetch the Blueprint row alongside the
  existing profile + preferences fetch.
- **Coaching / premium upsell** — the results "Unlock Deep Dive Intelligence™" CTA links to
  the existing coaching/plan upsell path (mirror resume-score / LinkedIn upsells). The premium
  Deep Dive suite itself (`assessment.md` Sections 12–20) is **out of scope** — CTA only.

---

## 8. Docs to Update (after build)

Done as part of this plan — each got a one-line **status-note pointer** (not a rewrite),
framing the Blueprint as the first assessment in the planned suite and noting Tier 2 stays
plan-gated:

- `docs/ec-feature-list.md` §6 — pointer added.
- `docs/ec-candidate-journey.md` Stage 4 — pointer added; Tier 2 plan-gated clarified.
- `docs/ec-dev-plan.md` Sprint 5 (E5) — pointer added; checklist left as legacy context.

---

## 9. Verification

- `npm run supabase:types` regenerates cleanly; `npm run type-check` + `npm run lint` pass.
- `npm run dev`: sign in → dashboard shows the Blueprint profile-strength step incomplete →
  `/assessment` → complete 30 Qs → instant results render with archetype + all cards
  (no spinner stall, no console errors).
- DB check (Supabase MCP `execute_sql` or SQL editor): one `assessment_responses` row for the
  user with populated `result` + `archetype`; `candidate_scores` row has the five P1
  dimensions + `overall_score`; `mindset_score` / `communication_score` null.
- Reload `/assessment` → lands on persisted results; Retake overwrites (no duplicate rows).
  Dashboard step now complete; archetype nudge appears; profile page shows archetype.
- Overlap check: confirm `submitBlueprint` never writes `candidate_preferences` and the runner
  never re-asks role/seniority/industries/salary/skills.
