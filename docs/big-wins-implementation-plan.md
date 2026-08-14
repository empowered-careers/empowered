# Big Wins — Implementation Plan

**Status: 🔨 Built 2026-08-14, not yet walked.** All seven build steps below are done
and verified (type-check, lint, production build, `big-wins.check.ts`). The seed
migration **is** applied — the `Big Wins` `assessments` row exists.

What remains: **no end-to-end run yet.** `resumes` has 0 rows in this project, so
there is no parsed resume for the gate to pass. Upload one, then walk the list under
"Remaining verification". Everything verified so far is static.

Price gating was deliberately left out — see open question 2.

Spec: `docs/big_wins_q&a.md`. This doc is the "how it fits the codebase" layer.

## What it's for

A shipped product surface alongside the Career Identity Blueprint. Once a resume is
parsed, the candidate can trigger Big Wins to **rewrite each role on their resume** —
the Q&A pulls the quantified impact out of them and the output replaces the weak
bullets the parser lifted verbatim.

That makes the parsed resume the "before" and the Big Wins output the "after." The
two must coexist: parser output stays canonical and untouched, and the rewrite is
stored as an **overlay** on top of it (see decision 2).

## Fit summary

Big Wins is **not** shaped like the Career Identity Blueprint:

|         | Blueprint                | Big Wins                                      |
| ------- | ------------------------ | --------------------------------------------- |
| Input   | 30 fixed MCQs            | free text, N per role, resume-driven          |
| Flow    | linear, fixed length     | nested loop (role → 4–6 questions), skippable |
| Output  | scores + archetype blob  | rewritten resume bullets, per role            |
| Compute | pure TS (`blueprint.ts`) | one Anthropic call per role                   |

So it **reuses the persistence layer** (`assessments` / `assessment_responses`) and the
route/server-client shape, but gets its own runner and its own lib module. Nothing in
`src/lib/assessment/blueprint.ts`, `questions.ts`, or `types.ts` should be touched.

The Assessments index already carries a `big-wins` "Coming soon" card
(`assessments-index.tsx:57`) — that becomes the live card.

## Decisions

**1. Storage: reuse `assessment_responses`, no new table.**
One seeded row in `assessments` with a fixed UUID (mirrors
`BLUEPRINT_ASSESSMENT_ID` / `20260602000000_blueprint_assessment_seed.sql`).
`responses` = raw candidate answers keyed by `"<company>|<title>":<categoryKey>`.
`result` = the finished `BigWinsResult` blob: per-role rewritten bullets, keyed the
same way.
Rejected: a `big_wins` table with a row per bullet — the overlay is read whole, per
role, every time. Revisit if bullets ever need to be queried or scored individually.

**2. The rewrite is an overlay on `resumes.parsed_json`, never a write into it.**
`parsed_json` is parser output and participates in dedup/supersession (`file_hash`,
`is_current`); overwriting `work_experience[].bullets` would make a re-upload
silently clobber the candidate's rewrite, and would destroy the "before" half of
before/after. So:

- **Read path:** whatever renders a role's bullets — `resume-client.tsx:312`, the
  Big Wins results view, any future export — merges `parsed_json.work_experience`
  with the Big Wins result by `"<company>|<title>"`, preferring the rewritten
  bullets when present. One small pure `mergeRoleBullets()` in `big-wins.ts`; do not
  duplicate the merge at each call site.
- **Key by `company|title`, not array index.** A re-upload reorders or drops roles;
  the composite key survives it, and unmatched keys render as "from a previous
  resume." This is what makes the overlay stable, so it is not optional.
- **Nothing is destructive.** Retaking Big Wins overwrites the overlay, not the resume.

**3. Do not touch `candidate_scores`.**
The Blueprint already owns `impact_score`. Big Wins writing it would mean whichever
assessment ran last wins. v1 writes no scores. (Open question below.)

**4. Role → category mapping is a static keyword match on the title, not an LLM call.**
Section 3's table is ~9 buckets; a regex/keyword list over `work_experience[].title`
covers it, falling back to A/B/C/D per the spec's own default.
`// ponytail: keyword title match; swap for an LLM classify call if misrouting shows up in real usage.`

**5. Exactly one LLM call per role, at the end of that role — not per answer.**
The vague→quantified conversion (Section 4) batches the role's answers into a single
Anthropic call that returns polished bullets, which feed the Section 6 recap screen
("here's what we pulled out for [Role] — anything missing?"). Everything else in the
spec — the ask, the dig-deeper follow-up, the example flip, the Section 4 prompt
table, the Section 5 reconstruction sequence — is **static copy** and needs no model.

**6. Synchronous server action, no Inngest.**
One call, a few seconds, user is on the screen waiting for their recap. The async
background-job pattern in CLAUDE.md is for work the user navigates away from.
Reuses `getAnthropic()` from `src/lib/llm/anthropic.ts`.

**7. Gate: requires a current parsed resume.**
Server component checks for `resumes` where `is_current` and `status = 'complete'`;
otherwise redirect to the upload flow. Intake is already mandatory, so this is a
guard, not a new gate.

**8. Two entry points, one route.**
The Assessments index card, and — the primary one — a CTA on `/resume` in the
"Parsed content" block once `status = 'complete'`: a "Rewrite these bullets" button
per role that deep-links to `/assessments/big-wins?role=<company|title>`, plus a
top-level "Rewrite my resume" that starts at the most recent role. Same route and
same step machine either way; the query param just picks the starting role.

## Files

New:

| Path                                                              | What                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/assessment/big-wins.ts`                                  | Types, the 9 category definitions (ask / dig / flip), `categoriesForTitle()` (Section 3), `vaguenessNudge()` + `hasNumber()` (Section 4), `RECONSTRUCTION_STEPS` (Section 5), `roleKey()`, `rolesFromParsed()`, `mergeRoleBullets()`. |
| `src/lib/assessment/big-wins.check.ts`                            | Runnable self-check: `npx tsx src/lib/assessment/big-wins.check.ts`.                                                                                                                                                                  |
| `src/lib/llm/polish-wins.ts`                                      | `polishWins(role + answers) → string[]`. Zod-validated, same shape as `parse-resume.ts`. Returns `[]` without a call when every answer is empty.                                                                                      |
| `src/app/actions/big-wins.ts`                                     | `saveRole()` — polish + persist one role. `editRoleBullets()` — save the candidate's own edits, no model call.                                                                                                                        |
| `src/app/(app)/assessments/big-wins/page.tsx`                     | Server component: auth, resume gate, load existing answers + result, roles from `parsed_json.work_experience`, `?role=` deep link.                                                                                                    |
| `src/components/assessment/big-wins-client.tsx`                   | Step machine: `overview → question → polishing → recap`.                                                                                                                                                                              |
| `src/components/assessment/big-wins-question.tsx`                 | One question at a time: textarea, Skip, dig-deeper nudge, example-flip-after-first-attempt, reconstruction path in a native `<details>`.                                                                                              |
| `src/components/assessment/big-wins-recap.tsx`                    | Per-role recap: rewritten bullets, before-state in a `<details>`, inline edit (one bullet per line), "answer more questions for this role".                                                                                           |
| `src/components/assessment/big-wins-overview.tsx`                 | Role list with per-role status + Rewrite/Redo, opening frame on first visit, orphaned-role section.                                                                                                                                   |
| `supabase/migrations/20260814000000_big_wins_assessment_seed.sql` | Seed the `assessments` row. Applied.                                                                                                                                                                                                  |

The plan's separate `big-wins.types.ts` was folded into `big-wins.ts` (~30 lines of
types, one module), and `big-wins-results.tsx` became `big-wins-overview.tsx` — the
"already done" view and the landing view are the same screen, so there was no second
component to write.

Modified:

- `src/lib/assessment/constants.ts` — `BIG_WINS_ASSESSMENT_ID`.
- `src/components/assessment/assessments-index.tsx` — Big Wins promoted out of `COMING_SOON` to a live card with per-role progress.
- `src/app/(app)/assessments/page.tsx` — fetches the Big Wins response + current resume alongside the Blueprint (one `Promise.all`).
- `src/app/(app)/resume/page.tsx` + `src/components/resume/resume-client.tsx` — fetch the overlay, render merged bullets in the work-experience block, per-role "Rewrite these bullets" + section-level CTA.
- `src/lib/llm/prompts.ts` — `BIG_WINS_SYSTEM_PROMPT` (v1.0.0).
- `src/lib/llm/schemas.ts` — exported the existing `WorkExperience` type (was inferred inline).
- `src/components/ui/textarea.tsx` — added via `npx shadcn add textarea`.

Not needed in the end: no `query-keys.ts` entry (the client uses server actions +
`router.refresh()`, no TanStack Query), no `db.ts` change, no schema change beyond the
seed row.

## Build order

All seven steps are written. What's verified so far is static only — `npm run type-check`,
`npm run lint`, `npm run build` (the `/assessments/big-wins` route compiles), and
`npx tsx src/lib/assessment/big-wins.check.ts`.

- [x] 1. **Content module.** All Section 2–5 copy, typed, plus `roleKey()` / `mergeRoleBullets()`.
     ✅ `big-wins.check.ts` asserts every category has ask/dig/flip and a quantified
     example flip; that the title classifier returns the spec's categories for one
     title per row of the Section 3 table (11 titles, including the unclassifiable
     default) and always surfaces 4–6 questions; and that `mergeRoleBullets` prefers
     the overlay, falls through to parser bullets, keeps roles dropped from a
     re-uploaded resume, and never blanks originals on an empty rewrite.
- [x] 2. **Seed migration + constant.** ✅ Applied; the `Big Wins` assessments row exists.
- [x] 3. **LLM polish function.** ⏳ Not yet run against a real role — needs an API call.
- [x] 4. **Server actions.** ✅ Type-checks; upsert path unexercised until step 2 lands.
- [x] 5. **Runner UI + role loop.** ⏳ Not yet walked in the dev server.
- [x] 6. **Overview (before/after) + index card.** ⏳ Not yet reloaded live.
- [x] 7. **Resume overlay + CTAs.** ⏳ The re-upload-survival check is the important one
     and hasn't been run.

### Remaining verification

Upload a resume first (`resumes` is empty), then walk it once as a real candidate:

1. Complete two roles end to end; skip a question; trigger a Section 4 nudge with a
   vague answer; use "answer more questions for this role".
2. Reload `/assessments` and `/assessments/big-wins` — the result renders from the
   stored blob without re-running the model.
3. Confirm `/resume` shows rewritten bullets for the rewritten role and originals for
   every other role.
4. Re-upload the same resume and confirm the rewrite survives (this is the whole point
   of keying on `company|title`).
5. Clear a role's bullets in the recap editor and confirm it reverts to the parser's
   originals rather than rendering empty.

## Open questions

1. **Does Big Wins feed a score?** v1 says no (decision 3). If it should, the cleanest
   route is a separate column, not sharing `impact_score` with the Blueprint.
2. **Free or paid?** Deferred by decision — GT called it: build the product, price it
   after. Shipped with no entitlement check at all. If it becomes à-la-carte, the slot
   is the gate in `src/app/(app)/assessments/big-wins/page.tsx`, which already
   redirects when there's no parsed resume: add an `enrollments` lookup beside it.
   Never a plan gate (CLAUDE.md rule 2). The `/resume` CTAs and the Assessments card
   would each need a locked state too.
3. **Does the rewrite ever leave the platform?** A "download my rewritten resume"
   export is the obvious next ask and the overlay supports it, but it is a separate
   feature (formatting, PDF generation) and is out of scope here.
4. **Roles with no bullets on the resume at all.** The parser preserves bullets
   verbatim, so a sparse resume gives Big Wins nothing to show as "before." Fine —
   the after column just stands alone — but confirm that's the intended UX rather
   than a reason to block those roles.
