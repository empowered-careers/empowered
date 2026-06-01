# Career Identity Blueprint™ — Public Lead-Magnet Plan (Future)

> Status: **Planned for later. DO NOT implement yet.**
> Scope: Deliverable 2 — a standalone public ads page that extracts a _section_ of the
> Blueprint as an anonymous, no-login lead-generation funnel.
> Prerequisite: ✅ Deliverable 1 **shipped 2026-06-02**
> (`docs/done/career-blueprint-integration.md`) — this funnel reuses its questions +
> scoring engine. Concrete reuse points captured in §8 below.

---

## 1. Context & Goal

The in-app Blueprint (Deliverable 1) lives behind login. Per `docs/assessment.md`, the free
QuickStart scan is explicitly designed for **virality, referrals, and lead generation**
("No sign-up required"). To exploit that for paid acquisition, we extract a **short section**
of the Blueprint into a public, anonymous page suitable for ad traffic.

**Goal:** A cold visitor from an ad takes a ~2-minute scan with no account, gets an
identity-forming teaser result (_"You lead like a Vision-Led Leader™"_), and converts to
signup to unlock the full Blueprint and matched roles. The captured email becomes a lead in
the existing acquisition layer, and the anonymous answers carry over so the in-app Blueprint
is pre-filled after signup.

This funnel must **not fork the assessment logic** — it reuses the same `questions.ts` subset
and `blueprint.ts` scoring built in Deliverable 1.

---

## 2. Funnel Section to Extract

Recommend the punchiest, most identity-forming slice rather than the full 30 questions:

- **Leadership & Influence** (prototype Qs 6–10) + **Company Culture Fit** (Qs 11–15)
  → ~10 questions, ~2 minutes.
- These produce the two most shareable, "I am a \_\_\_" outputs: **Leadership Style** and
  **Company Fit** — the strongest hooks for ad creative and social sharing.

**How to filter in code (D1 already supports it):**

```ts
import { QUESTIONS } from "@/lib/assessment/questions";

// BlueprintQuestion carries a `section` field — "leadership" | "culture" | …
const subset = QUESTIONS.filter(
  (q) => q.section === "leadership" || q.section === "culture"
);
// Zero-indexed in the full list this is indexes 5–14 (10 questions).
```

The teaser computes a partial result from this subset. Build a thin
`scoreBlueprintSubset(answers)` helper alongside `blueprint.ts`:

- Tally only the `ls_*` and `cs_*` / `stage_*` weights that this subset can
  actually emit. **Don't reuse `computeAxes`** — it expects all 30 answers and
  several axes will collapse to `0` causing misleading 50/50 spectra.
- Output: `{ leadership_style, leadershipCopy, dominantStage, companyFitCopy }`
  — drawn from `ARCHETYPES[leadership_style]` (use `leadershipTitle` + body, **not**
  the archetype name, since archetype identity requires the full run) and
  `COMPANY_FIT[dominantStage]` from `content.ts`.

Full archetype, symmetry, burnout, energy audit, and guidance stay gated behind
signup + the full in-app run.

---

## 3. Surface & Routing

- **Public route outside `(app)`** (e.g. `src/app/blueprint/page.tsx`) — `index`-able
  (`robots: index`), unlike the authed `/assessments/ci-blueprint`.
- **OG image** via the existing `src/app/api/og/route.tsx` for rich social/ad cards.
- Screens: hero/welcome → short question runner → **teaser result** → conversion CTA
  ("Sign up to save your Blueprint & unlock matched roles").
- **Reusable runner UI:** `BlueprintRunner` from
  `src/components/assessment/blueprint-runner.tsx` is already a controlled
  component (`currentQ` / `answers` / `onSelect` / `onBack` / `onNext` props). It
  reads `QUESTIONS` directly today — to drive it with a subset, either parameterise
  it to accept a `questions` prop or wrap with a shim that maps subset-index ↔
  full-index.
- **Result visuals:** the results page (`blueprint-results.tsx`) consolidates
  archetype hero + cards into a single file. For the public teaser, extract just
  the hero band + a single fit/leadership card — don't import the whole results
  page (it includes burnout meter, symmetry, interview/LinkedIn lists, all of
  which depend on full-axis output).
- Match the in-app visual language: dark `bg-foreground text-background` hero band
  - `bg-card border-border` cards. See §9 for the CSS gotchas already solved.

---

## 4. Anonymous → Authenticated Continuity

The existing `leads` table already bridges anonymous acquisition → signup via **email match
at the OAuth callback** (`leads.converted_profile_id` is stamped when an authenticated user's
email matches a lead row; `profiles.lead_id` / `acquisition_source` / `acquisition_ref` mirror
the source). Reuse this rather than inventing a new bridge:

1. Anonymous visitor completes the subset; answers held client-side (cookie / localStorage).
2. On the teaser CTA, capture email → write a `leads` row (service-role, via an API route
   modeled on `src/app/api/events/register/route.ts`), tagging `source` / `source_ref` with
   the ad campaign, and stashing the subset answers (see Open Questions for where).
3. After OAuth signup, the callback's existing lead-match logic stamps the profile.
4. A post-signup step replays the stored subset answers through `submitBlueprint` so the
   in-app Blueprint runner is pre-filled (candidate finishes the remaining sections instead
   of starting over).

**Replay caveat (small lift on D1 code):**

- `submitBlueprint` (in `src/app/actions/assessment.ts`) currently **validates that
  all 30 answers are present** and rejects partial input. The pre-fill replay
  therefore needs to either (a) hold the subset answers client-side until the user
  finishes the remaining 20 questions in the runner, then submit the merged set —
  or (b) loosen `submitBlueprint` to accept partial input and degrade gracefully
  (not recommended; `candidate_scores` derivation assumes full coverage).
- `AssessmentClient` (`src/components/assessment/assessment-client.tsx`) starts
  with `answers = {}` and `currentQ = 0`. Pre-fill needs a new `initialAnswers?:
Answers` prop and a small change to "skip to first unanswered question" on mount.
  ~20 lines of work.

---

## 5. Lead Capture

- Tie into the existing **`leads` / `events` acquisition layer** (recent
  "events and leads schema" commit; `app/api/events/*`) — **do not** add a new table.
- `leads.source` ∈ `linkedin | email | instagram | direct | referral | other`;
  `leads.source_ref` carries the campaign slug / ad id.
- Service-role writes bypass RLS (same pattern as `/api/events/register`); candidates have no
  self-read on `leads`, which is fine — they never need to see their own lead row.

---

## 6. Open Questions (resolve before building)

- **Subset re-scoring:** confirm the "don't reuse `computeAxes`" decision in §2
  — write `scoreBlueprintSubset` from scratch on just `ls_*` + `stage_*` weights?
  Or reuse `computeAxes` and accept that axes outside the subset will read as
  neutral 50? The first is cleaner; the second is a one-liner.

- **Anonymous answer storage:** cookie/localStorage only, or persist onto the `leads` row
  (e.g. a new `lead_payload jsonb` column) so answers survive across devices?
- **RLS for anonymous writes:** confirm the service-role API-route pattern is the right
  boundary; no anon client writes to `leads` directly.
- **Does the public slice write any `candidate_scores`?** Recommended: **no** — scores are an
  authenticated, post-signup concern; the public funnel only stores the lead + answers.
- **Teaser reveal depth:** how much to show before the gate — full leadership-style + fit
  cards, or a partial/blurred reveal that maximizes signup conversion?
- **Abuse / rate limiting** on the public submit + email capture endpoints.
- **Analytics:** funnel events (start → complete subset → email captured → signup) — wire into
  whatever analytics the acquisition layer uses.

---

## 7. Out of Scope (for this funnel)

- The full 30-question run, premium Deep Dive, and `candidate_scores` population — all remain
  the in-app Blueprint's job (`docs/done/career-blueprint-integration.md`).
- No new assessment scoring logic — strictly a subset of the existing engine.

---

## 8. Building blocks already in place (post-D1)

Concrete reuse points — these all exist and are stable:

| Need                                         | Use                                                                                                                    |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Questions + per-option axis weights          | `src/lib/assessment/questions.ts` — `QUESTIONS: BlueprintQuestion[]`, each with `section`, `text`, `options[].weights` |
| Section filter                               | `BlueprintQuestion.section` ∈ `"energy" \| "leadership" \| "culture" \| "audit" \| "communication" \| "direction"`     |
| Full scoring engine (read for reference)     | `src/lib/assessment/blueprint.ts` — `computeAxes`, `scoreBlueprint`, `deriveCandidateScores`                           |
| Archetype / leadership / fit / comm copy     | `src/lib/assessment/content.ts` — `ARCHETYPES`, `COMPANY_FIT`, `COMM_STYLES`, `BURNOUT_COPY`, line banks               |
| Section metadata (Lucide icon names + label) | `SECTION_META` in `content.ts`                                                                                         |
| Typed shapes                                 | `src/lib/assessment/types.ts` — `Answers`, `CultureAxes`, `BlueprintResult`, `VoiceProfile`, `LeadershipStyle`, etc.   |
| Runner UI                                    | `src/components/assessment/blueprint-runner.tsx` — controlled, parameterisable                                         |
| Welcome / loading screens                    | `blueprint-welcome.tsx`, `blueprint-loading.tsx`                                                                       |
| Lead acquisition layer                       | `leads` table + `src/app/api/events/register/route.ts` (service-role pattern)                                          |
| OG image renderer                            | `src/app/api/og/route.tsx`                                                                                             |

**Fixed values that will not change:**

- `BLUEPRINT_ASSESSMENT_ID = 'c1b2e3f4-5a6b-4c8d-9e0f-a1b2c3d4e5f6'`
  (`src/lib/assessment/constants.ts`)
- `BLUEPRINT_QUESTION_COUNT = 30`

---

## 9. Considerations carried from Deliverable 1

Things D1 learned that will save the lead-magnet build time:

- **5-archetype model is locked.** One archetype per `LeadershipStyle`. The
  prototype's 6-archetype split (people-led vs mission-led "Purpose-Driven
  Catalyst") was collapsed. The public teaser should use the same 5; don't
  resurrect the prototype map.
- **Heading colors are theme-aware now.** `globals.css` was patched so
  `h1–h6 { color: var(--foreground) }` — headings on dark surfaces inherit
  `text-background` cleanly. The Deliverable 1 hero `<h1>` carries a defensive
  explicit `text-background` class; mirror that pattern on the public hero too,
  even though it's no longer strictly necessary.
- **Lime accent (`--accent: #CCFF00`) is unreadable as text on light backgrounds.**
  For chips/tags use solid `bg-accent text-accent-foreground`, **not**
  `bg-accent/10 text-accent`. The "gold tone" tag pattern in `blueprint-results.tsx`
  is the canonical reference.
- **Determinism.** Scoring is sub-millisecond pure functions. The in-app
  Blueprint uses a 1.5–2s cosmetic loading screen for narrative pacing; the
  public funnel can do the same or skip it (recommend: skip — ad traffic
  optimises for time-to-result).
- **Engineering explainer:** `docs/career-blueprint-logic.html` is the
  human-readable scoring walkthrough — useful for the marketing copywriter
  framing the teaser's "what we measure" pitch.
- **No new DB migrations needed** for the funnel itself if anonymous answers
  ride client-side or in `lead_payload jsonb`. The only DB-touching path is
  the post-signup replay, which writes to existing tables via the existing
  `submitBlueprint` action.
