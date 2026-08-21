# Evals

Test the resume/LinkedIn parsers and scorers before bumping
`RESUME_PROMPT_VERSION` / `LINKEDIN_PROMPT_VERSION` or swapping models.

`tsx` is a devDependency, so `npm ci` is all the setup there is. The eval
scripts load `.env.local` if it's there (`--env-file-if-exists`).

## Which suites run where

|                 | Offline (`--replay`)   | Needs a key                  |
| --------------- | ---------------------- | ---------------------------- |
| Resume scorer   | ✅ 6 golden cases      | `--record` / `--live`        |
| LinkedIn scorer | ✅ 4 golden cases      | `--record` / `--live`        |
| Resume parser   | ❌ no committed inputs | always — bring your own PDFs |
| LinkedIn parser | ❌ no committed inputs | always — bring your own PDFs |

The scorers take already-parsed JSON, so their inputs can live in the repo as
synthetic profiles (`evals/*/golden/*.json`) that describe nobody. The parsers
take PDFs, and a resume PDF realistic enough to be a useful fixture is somebody's
actual resume — PII the repo can't hold. Those two suites stay local-only.

```bash
npm run eval:scorers     # both scorer suites, offline, free
npm run eval:all         # adds the two parser suites (no-ops without fixtures)
```

Each suite exits non-zero when a gate fails: rubric pass rate ≥ 0.95,
pairwise accuracy ≥ 0.85, label agreement ≥ 0.80.

## Modes

- `--replay` (default) — read `evals/<suite>/recorded/<id>.json`. No API calls,
  no key, deterministic. Proves the **graders** still agree with the recorded
  responses; it cannot see model drift.
- `--record` — call the model, overwrite the recordings, then grade. Run this
  after a deliberate prompt change.
- `--live` — call the model, write nothing. This is the run that catches drift.

```bash
npm run eval:scorer -- --record
npm run eval:linkedin-scorer -- --live
```

## What's graded

**Rubric checks** (`evals/*/rubric-checks.ts`) — deterministic per-dimension
assertions ("a resume with zero quantified bullets must score ≤ 45 on
impact_signals"). These are the real correctness gate: they encode what the
rubric must get right regardless of what any reference run said.

**Pairwise accuracy** (`evals/*/pairs.json`) — hand-ranked ordering claims.
Only include pairs the rubric should decide cleanly. A pair that ties isn't
necessarily a bug — two mediocre resumes landing on the same score is a
defensible verdict — and keeping one only makes the gate noisy.

**Label agreement** — `|scored − label.overall| ≤ 8` (`SCORE_TOLERANCE` in
`evals/shared/golden.ts`). The label is a **frozen reference**, not ground
truth: the metric is agreement-with-reference, so this catches drift, not
absolute wrongness. Re-freeze a label only deliberately, and say why in the
case's `note` — never to turn a red run green.

## Adding a golden case

Drop a JSON file in `evals/<suite>/golden/`:

```json
{
  "id": "flat-trajectory-senior",
  "synthetic": true,
  "note": "What this case exercises, and any re-freeze history.",
  "input": {
    "...": "ParsedResume, or { profile, oauth_headline } for LinkedIn"
  },
  "label": { "overall": 52, "provenance": "reference-frozen-v1" }
}
```

Then `npm run eval:<suite> -- --record` to capture its response, and add a pair
to `pairs.json` if it makes a clean ordering claim against an existing case.

## Parser fixtures (local only)

Place 30-50 PDF resumes in `evals/parser/fixtures/` (clean, multi-column,
designer, scanned — mix realistic). For each `foo.pdf`, create
`evals/parser/ground-truth/foo.json`:

```json
{
  "skills": ["TypeScript", "React", "AWS", "..."],
  "companies": ["Stripe", "Datadog"],
  "dates": [{ "company": "Stripe", "start": "2021-06", "end": null }],
  "seniority_level": "staff",
  "total_years_exp": 10.5
}
```

Targets: skills F1 ≥ 0.85, company exact-match ≥ 0.95, date parse accuracy
≥ 0.90. PDF fixtures are skipped in replay mode — the parse is part of what's
under test on that path, so it can't be replayed.

## When to run

- `eval:scorers` before bumping either prompt version, and after any edit to
  `src/lib/llm/prompts.ts`.
- `--live` before swapping `ANTHROPIC_PARSER_MODEL` / `ANTHROPIC_SCORER_MODEL`.
- Weekly on a production sample (drift detection — separate job, TBD).
