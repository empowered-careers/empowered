# Evals

Test the resume parser and scorer against ground-truth fixtures before bumping `RESUME_PROMPT_VERSION` or swapping models.

## Setup

```bash
npm i -D tsx
```

Requires `ANTHROPIC_API_KEY` in your local env. Run from repo root.

## Parser eval

Place 30-50 PDF resumes in `evals/parser/fixtures/` (clean, multi-column, designer, scanned — mix realistic). For each `foo.pdf`, create `evals/parser/ground-truth/foo.json` with the expected fields:

```json
{
  "skills": ["TypeScript", "React", "AWS", "..."],
  "companies": ["Stripe", "Datadog"],
  "dates": [{ "company": "Stripe", "start": "2021-06", "end": null }],
  "seniority_level": "staff",
  "total_years_exp": 10.5
}
```

Run:

```bash
npm run eval:parser
```

Targets: skills F1 ≥ 0.85, company exact-match ≥ 0.95, date parse accuracy ≥ 0.90.

## Scorer eval

`evals/scorer/pairs.json` has hand-ranked pairs: `[{ "stronger": "fixtureA", "weaker": "fixtureB", "reason": "..." }]`. Each id maps to a parser fixture.

`evals/scorer/rubric-checks.ts` has deterministic per-dimension assertions (e.g. "candidate with 12 years should score ≥ 80 on tenure").

Run:

```bash
npm run eval:scorer
```

Targets: pairwise accuracy ≥ 0.85, rubric pass rate ≥ 0.95.

## When to run

- Before bumping `RESUME_PROMPT_VERSION` in `env.ts`.
- Before swapping `ANTHROPIC_PARSER_MODEL` or `ANTHROPIC_SCORER_MODEL`.
- Weekly on a production sample (drift detection — separate job, TBD).
