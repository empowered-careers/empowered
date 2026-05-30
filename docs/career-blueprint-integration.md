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

**Goal:** A signed-up candidate takes the Blueprint from the dashboard and gets an instant,
identity-forming result (the virality hook — _"I'm a Visionary Builder™"_). That result is a
reusable **candidate-intelligence layer** with three consumers:

1. **Display** — the candidate's own result cards + dashboard/profile nudges.
2. **Company-culture match (future)** — normalized 0–100 axes the future _company profile +
   culture report_ will be scored on too, so matching is an apples-to-apples similarity calc.
3. **Resume + LinkedIn personalization** — the intrinsic thinking, motivation, and
   communication-voice signal feeds the existing resume-rewrite / LinkedIn-audit LLMs so their
   output reflects who the candidate actually is.

It also populates the five `candidate_scores` dimensions and nudges toward coaching / premium.

### Locked decisions

| #   | Decision                                                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Model:** single 30-Q Blueprint now; its scoring populates all 5 `candidate_scores` dimensions. ("Blueprint now, the rest later.")                                                                                           |
| 2   | **Tier 2 access:** unchanged — `canSeeJobTier()` stays plan-gated. Blueprint is a profile-strength / match-quality / conversion lever, **not** an access gate.                                                                |
| 3   | **Surface:** authed-only, inside the `(app)` route group.                                                                                                                                                                     |
| 4   | **Lead magnet:** future, separate; only a planning doc now (`career-blueprint-lead-magnet.md`).                                                                                                                               |
| 5   | **No question overlap** with onboarding (`candidate_preferences`) or resume/LinkedIn capture.                                                                                                                                 |
| 6   | **Canonical axes now:** replace the prototype's ~25 loose keys (several dead-ended) with a small normalized 0–100 axis set, shared by candidate **and** the future company profile (§2.5).                                    |
| 7   | **Two axis families, kept separate:** _preference_ axes (what the candidate wants → match vs company reality) and _trait_ axes (innate wiring → compatibility + resume/LinkedIn voice). The future matcher weights each.      |
| 8   | **Match axes (all four):** company stage/size fit, culture values & environment, structure-vs-autonomy, pace & sustainability.                                                                                                |
| 9   | **Storage:** structured per-axis scores (queryable) **and** the rich display result blob.                                                                                                                                     |
| 10  | **Downstream wiring:** the result shape supports company-match + resume/LinkedIn personalization now; the actual matcher and LLM-prompt injection are scoped as fast-follows (§7.5), not blockers for shipping the Blueprint. |

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

## 2.5. Canonical Dimension Taxonomy (the shared vocabulary)

The prototype tallies ~25 loose keys (`energy`, `strategic`, `growth`, `creative`, `digital`,
`visibility`, `meeting_drain`, …), several of which its own scoring never reads. We **do not
port those keys**. Instead the engine maps each question/option onto a small, normalized,
**0–100** axis set that is the single source of truth for display, matching, and LLM voice.
The **same axis keys** will be applied to the future _company profile + culture report_, so a
candidate↔company match is a similarity calc over shared axes.

Two families, stored separately (decision #7):

**A. Preference axes** — _what the candidate wants / thrives in_ (match against company reality):

| Axis                    | 0 ←→ 100                                                                              | Sourced from (Qs) |
| ----------------------- | ------------------------------------------------------------------------------------- | ----------------- |
| `company_stage_fit`     | distribution across startup / growth / enterprise / mission (store all four, not one) | 3, 11, 26–27      |
| `culture_values`        | distribution across collaborative / innovative / results-driven / purpose-driven      | 7, 9, 11, 14, 25  |
| `structure_vs_autonomy` | high structure ←→ high autonomy                                                       | 2, 12, 13, 28     |
| `pace_sustainability`   | thrives on intensity/urgency ←→ needs balance/recovery (incl. burnout-risk signal)    | 5, 16, 17, 20     |

**B. Trait axes** — _innate wiring_ (compatibility signal + resume/LinkedIn voice):

| Axis                   | 0 ←→ 100                                                                                                                   | Sourced from (Qs) |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `people_vs_analytical` | logic-led ←→ human-led                                                                                                     | 6, 8, 10, 15      |
| `vision_vs_execution`  | execution/operator ←→ vision/builder                                                                                       | 1, 9, 15, 29      |
| `external_vs_internal` | internal processor ←→ external processor                                                                                   | 4, 23             |
| `leadership_style`     | categorical → one of the 5 `assessment.md` styles (Vision-Led / Precision / Empowerment / Performance / Strategic-Systems) | 6–10              |
| `communication_style`  | categorical → Executive / Storytelling / Analytical / Trusted-Advisor                                                      | 21–25             |

The familiar prototype outputs (archetype name, Career Symmetry bars, green/red-light tags,
burnout meter, interview/strategy/LinkedIn copy) are **derived from these axes** for display —
they are presentation, not the source of truth. Question→axis weights live in `questions.ts`
and are documented inline; dead-end prototype keys are dropped.

---

## 3. Data Model

Reuse the existing tables. Add **one migration** under `supabase/migrations/` that:

1. **Seeds one `assessments` row** — name `Career Identity Blueprint`, `question_count` 30,
   with a fixed UUID referenced from app code as `BLUEPRINT_ASSESSMENT_ID`
   (`src/lib/assessment/constants.ts`).
2. **Extends `assessment_responses`** (the display + audit record) with:
   - `result jsonb` — the full computed display blob (archetype, all cards, spectrums, copy).
   - `archetype text` — denormalized archetype name for fast display / sharing / admin lists.
3. **Adds the structured, queryable axes to `candidate_scores`** (one row per profile — the
   canonical "computed dimensions per candidate" home, used by matching):
   - `culture_axes jsonb` — the normalized 0–100 preference **and** trait axes from §2.5,
     keyed by the canonical axis names. This is what the future company-match query and the
     resume/LinkedIn LLMs read (decision #9). Add a GIN index for future axis queries.
   - The existing five P1 dimension columns stay; they are **derived from the same axes**
     (see §4), not scored separately.
4. **Unique constraint** `(profile_id, assessment_id)` on `assessment_responses` so retakes
   **upsert (overwrite)** — one row per candidate per assessment, no history.
5. **RLS:** self read/insert/update keyed on `profile_id = auth.uid()`. The existing admin +
   employer-scoped overlays on `assessment_responses` / `candidate_scores`
   (`20260523000001_employer_rls.sql`) already cover row access; new columns inherit them —
   confirm during build.

After the migration:

- Run `npm run supabase:types`.
- Add aliases to `src/types/db.ts` (never inline `Database[...]` at call sites):
  `AssessmentRow`, `AssessmentResponseRow` / `Insert` / `Update`,
  `CandidateScoresRow` / `Insert` / `Update`.
- Hand-write typed shapes in `src/lib/assessment/types.ts`:
  - `CultureAxes` — the canonical axis keys → number (0–100) / categorical, mirrored later by
    the company profile so both sides type-check against one definition.
  - `BlueprintResult` — the display blob (archetype, leadership, companyFit, spectrums[],
    symmetry[], greenLight[], redLight[], commStyle, burnout, interview[], strategy[],
    linkedin[]) **plus** an embedded `voiceProfile` (see §4) for the resume/LinkedIn LLMs.

---

## 4. Scoring Engine (redesigned around canonical axes; server-side source of truth)

Scoring is **fully deterministic and instant** — no LLM, no long-running work. We therefore
**do not** use the async Inngest / Realtime job pattern (that is for resume/LinkedIn LLM work).
Submit computes synchronously and returns the result.

This is **not a verbatim port** of the prototype's math. We keep the questions and the result
_copy_, but re-route scoring through the §2.5 canonical axes (dropping dead-end keys). The
prototype's existing `getArchetype` / `getCompanyFit` / `getCommStyle` / `getBurnout` logic is
preserved as the **derivation** from axes → display, so results still feel the same.

New pure-TS modules under `src/lib/assessment/`:

- **`questions.ts`** — the 30 questions + per-option **axis-weight** maps (each option
  contributes to one or more canonical axes from §2.5). Single source of truth for the runner
  UI and scoring. Inline comments document each option→axis weight.
- **`content.ts`** — archetype / leadership / company-fit / comm-style / guidance copy lifted
  from the prototype + `assessment.md`.
- **`blueprint.ts`** — typed pure functions:
  - `computeAxes(answers) → CultureAxes` — tally option weights into the normalized 0–100
    preference + trait axes. **The canonical, matchable, persisted output.**
  - `scoreBlueprint(answers) → BlueprintResult` — calls `computeAxes`, then derives the display
    blob (archetype, company fit, comm style, spectrums, symmetry bars, green/red-light tags,
    burnout, interview/strategy/linkedin copy) **from the axes**, plus a `voiceProfile`
    sub-object (archetype, comm style, top motivational drivers, green-light strengths) shaped
    for LLM consumption (§7.5).
  - `deriveCandidateScores(axes) → { role_clarity_score, values_score, strengths_score,
leadership_score, impact_score, overall_score }` — maps the canonical axes onto the five
    Phase-1 columns (e.g. `values_score` from `culture_values`, `leadership_score` from
    `leadership_style`). Leave `mindset_score` / `communication_score` **null** (Phase 2, per
    `db_schema.md`). Document the mapping inline so it's auditable.

---

## 5. Server Action & Persistence

`src/app/actions/assessment.ts` (new), modeled on `actions/preferences.ts` / `actions/resume.ts`:

```
submitBlueprint(answers):
  1. auth-guard via server Supabase client
  2. axes = computeAxes(answers); result = scoreBlueprint(answers)
  3. upsert assessment_responses
       (profile_id, assessment_id=BLUEPRINT_ASSESSMENT_ID,
        responses=answers, score=result.overall, result, archetype, completed_at=now)
       onConflict (profile_id, assessment_id)
  4. upsert candidate_scores
       (profile_id, culture_axes=axes, ...deriveCandidateScores(axes))
       onConflict (profile_id)
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

## 7.5. Downstream Consumers (design now, wire as fast-follows)

The Blueprint output is built to feed two systems beyond its own result page. The Blueprint
build itself only needs to **persist the right shape** (`candidate_scores.culture_axes` +
`BlueprintResult.voiceProfile`); the consumers below are sequenced after it (decision #10).

**A. Resume + LinkedIn personalization (intrinsic voice → better rewrites).** The assessment
captures how the candidate thinks, what motivates them, and their communication voice — exactly
the context the existing LLM features lack. As a fast-follow:

- Extend `scoreResume(parsed, blueprint?)` (`src/lib/llm/score-resume.ts`) and
  `scoreLinkedIn(parsed, blueprint?)` (`src/lib/llm/score-linkedin.ts`) to accept an optional
  `voiceProfile` and inject it into the user message (the rubric system prompts in
  `src/lib/llm/prompts.ts` stay cached/unchanged; the voice context rides in the per-request
  message). When absent, behavior is unchanged — so this is purely additive.
- Effect: resume bullets and LinkedIn headline/About suggestions are toned to the candidate's
  communication style (Executive / Storytelling / Analytical / Trusted-Advisor) and lead with
  their motivational drivers and green-light strengths.

**B. Company-culture match (future).** When the _company profile + culture report_ ships, it is
scored on the **same** §2.5 axis keys. Matching becomes a similarity calc: preference axes vs
the company's actual reality, trait axes vs the company's culture archetype, weighted by the
matcher. Because candidate axes are already persisted in `candidate_scores.culture_axes`, no
re-derivation is needed — the matcher just reads both sides.

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
  user with populated `result` (incl. `voiceProfile`) + `archetype`; `candidate_scores` row has
  populated `culture_axes` (all §2.5 axis keys, 0–100) plus the five P1 dimensions +
  `overall_score` derived from those axes; `mindset_score` / `communication_score` null.
- Axis sanity: spot-check that contrasting answer sets produce sensibly different
  `culture_axes` (e.g. all-startup answers → high `company_stage_fit` toward startup), and that
  no dead-end prototype keys leaked into storage.
- Reload `/assessment` → lands on persisted results; Retake overwrites (no duplicate rows).
  Dashboard step now complete; archetype nudge appears; profile page shows archetype.
- Overlap check: confirm `submitBlueprint` never writes `candidate_preferences` and the runner
  never re-asks role/seniority/industries/salary/skills.
