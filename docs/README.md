# docs/

> **Start here:** the platform pivoted from job-board-first to coaching-first in
> August 2026. `ec-pivot-brief.md` is the direction, `ec-pivot-plan.md` is the
> implementation. Where any older doc conflicts with those two, they win — and
> the older doc should carry a banner saying so. If you find one that doesn't,
> add it.

Two kinds of docs live here:

- **Reference docs** — high-level direction, schema, journeys, operations. These stay in `docs/` and are updated in place.
- **Plan docs** (`ec-*-plan.md`, `todo.md`) — feature or workflow implementation plans with sprints/slices/checkboxes. These move to `docs/done/` when shipped.

## When is a plan "done"?

A plan moves to `docs/done/` when **both** are true:

1. The doc has a top-level `Status: ✅ Shipped <YYYY-MM-DD>` header.
2. All sprints/slices/checkboxes in the doc are complete (or explicitly descoped with a note).

See `docs/done/ec-candidate-pipeline-plan.md` and `docs/done/ec-job-board-plan.md` for the canonical shape.

## Subdirectories

| Dir           | Meaning                                                                     |
| ------------- | --------------------------------------------------------------------------- |
| `done/`       | Shipped plans — historical record, don't edit                               |
| `deferred/`   | Speced but deliberately not built yet; each says why and what unblocks it   |
| `deprecated/` | Superseded docs kept as narrative only — never cite these as current status |
| `reviews/`    | Point-in-time code reviews                                                  |
| `prototypes/` | Design/UX prototypes (HTML mocks + assessment content drafts)               |

## Current files

**The pivot (read these first):**

- `ec-pivot-brief.md` — why and what changes (GT). Supersedes the old sprint order.
- `ec-pivot-plan.md` — implementation: verified state, blockers, resolved decisions, build order
- `ec-catalog-setup.md` — ops runbook for Lauren: Stripe products, admin rows, coaches, Cal.com

**Reference (keep in place):**

- `context.md` — product/business context ⚠️ revenue model partially superseded
- `db_schema.md` — database schema + enums
- `design.md` — design system (tokens, fonts, conventions)
- `design-handoff-onboarding.md` — onboarding restyle handoff from design (merged 2026-07-31; items 1/2/6 since built)
- `big_wins_q&a.md` — Big Wins content spec: the question bank, role→category mapping, and conversation UX rules. Implementation lives in `big-wins-implementation-plan.md`.
- `career-positioning-assessment.pdf` — the Career Positioning Assessment spec (18 questions, 6 categories, scoring, tier copy, follow-up email). The source of truth for the public `/career-assessment` quiz; the implementation is `src/lib/assessment/career-positioning.ts`.
- `role-clarity-spec.md` — Role Clarity content + scoring spec: 18 questions, the option-index scoring model, and the three result bands. Reverse-engineered from the prototype artifact, not exported — provenance and the two source defects are documented in it.
- `ec-admin-operations.md` — admin ops + Loops email events
- `ec-candidate-journey.md` — ⚠️ largely superseded; intake spine + ICP still accurate
- `ec-feature-list.md` — ⚠️ accurate for what exists in code, not for what candidates can reach
- `ec-ui-plan.md` — UI conventions ⚠️ nav spec out of date; shell still accurate

**Active plans:**

- `todo.md` — manual/ops checklist (env vars, smoke tests). Its Stripe section now defers to `ec-catalog-setup.md`.
- `big-wins-implementation-plan.md` — 🔨 built 2026-08-14, seed migration applied, but **nothing walked end to end** (`resumes` is empty — upload one first). Content spec is `big_wins_q&a.md`.

**Superseded but still useful:**

- `ec-sprint-plan.md` — ⚠️ no longer the backlog. Its "Already shipped" section is the accurate floor the pivot builds on; everything after it is re-sequenced by `ec-pivot-plan.md` §6.

**Shipped (`done/`):** `career-blueprint-integration.md`, `ec-admin-recruiters-plan.md`, `ec-admin-super-plan.md`, `ec-candidate-pipeline-plan.md`, `ec-candidate-preferences-plan.md`, `ec-dashboard-ui-plan.md`, `ec-events-growth-plan.md`, `ec-job-board-plan.md`, `ec-notifications-plan.md`, `ec-paywall-plan.md`, `ec-seo-visibility-plan.md`, `notify-setup.md`

> `ec-job-board-plan.md` and `ec-paywall-plan.md` shipped and are now **dormant** — the code stays, the surfaces are unlinked. Historical record, not a to-do.

**Deferred:** `career-blueprint-lead-magnet.md`, `ec-blog-mdx-plan.md`, `ec-matching-implementation-plan.md`, `ec-matching-sprint-plan.md`, `ec-nudges-v2.md`, `ec-pii-minimized-parsing.md`

> The two matching docs moved here from `docs/` in the pivot — the spec is sound, it just depends on job-board inventory that's dormant. Note the pivot's JD → ATS checker (`ec-pivot-plan.md` §4) reuses the scoring approach candidate-initiated.

**Deprecated:** `ec-dev-plan.md`, `ec-sprint-checklist.md`, `ec-sprint-plan.md`, `resume-parsing.md`

## Known gaps

**Career Positioning Assessment** (public `/career-assessment`, 18 questions, shipped 2026-07-21).
The spec now lives here as `career-positioning-assessment.pdf`. Code verified against it 2026-08-19
— all 18 questions, 6 categories, and the three tier headlines/copy/CTAs match verbatim. Four
deliberate deviations, two of which are open decisions:

- **Scoring was changed on purpose and the PDF is the one that's wrong.** It specifies "max 12 per
  category, 72 total", but 1–5 scales max at 5 and MC at 4, so any category holding a scale question
  maxes at 13 and the real total is 79. `computeResults` normalises to percentages instead.
- **Open:** the tier cutoffs were then loosely converted — 30/72 (41.7%) became `<= 45`, and 51/72
  (70.8%) became `<= 72`. A candidate a hair into PDF-Tier-2 lands in code-Tier-1. These two numbers
  decide which service tier the follow-up call pitches, so confirm they're intentional.
- **Open:** the PDF asks to A/B the lead-capture placement (after Q2 vs. right before results). Code
  fixes it after Q2 (`career-positioning-quiz.tsx:31`). Not built either: the optional per-category
  breakdown gated behind the booking.
- Cosmetic: section 3 is "Mindset & Momentum" in code, "Mindset & Motivation" in the PDF. Q6's
  "Not sure how to tell the difference" scores 2, not the PDF's positional 4.

Its relationship to `deferred/career-blueprint-lead-magnet.md` — which specs a public funnel over a
_Blueprint_ question subset, still marked "DO NOT implement yet" — is unresolved. The pivot defers
the public lead-magnet funnel again (`ec-pivot-brief.md` §7), so this stays open.

**Two docs share the name `ec-sprint-plan.md`** — the June 2026 reconciled copy in `docs/` (marked
Superseded) and an older May 2026 generation in `deprecated/`. They are different documents, not a
stale duplicate. The `docs/` one is the one to read.
