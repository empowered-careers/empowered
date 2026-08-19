/**
 * Role Clarity content + scoring self-check.
 * Run: `npx tsx src/lib/assessment/role-clarity.check.ts`
 * ponytail: one runnable check for the non-trivial logic, no test framework.
 *
 * The four score fixtures are real measurements taken from the prototype, not
 * invented expectations — see docs/role-clarity-spec.md. If the scoring model
 * ever drifts, these are what catch it.
 */
import assert from "node:assert";

import {
  bandFor,
  normalise,
  optionCount,
  QUESTIONS,
  ROLE_CLARITY_MAX,
  ROLE_CLARITY_MIN,
  type RoleClarityAnswers,
  scoreRoleClarity,
  SECTION_MAX,
  SECTION_ORDER,
  SECTIONS,
} from "./role-clarity";

// ── Content completeness ─────────────────────────────────────
assert.equal(QUESTIONS.length, 18);
assert.equal(SECTION_ORDER.length, 6);

for (const key of SECTION_ORDER) {
  const s = SECTIONS[key];
  assert.ok(s, `missing section ${key}`);
  assert.equal(s.key, key, `section ${key} has mismatched key`);
  assert.ok(s.title.length > 0, `${key} missing title`);
  assert.ok(s.tip.length > 40, `${key} tip too thin to be actionable`);
}

// Every section is exactly one 1–5 likert + two 1–4 choices, which is what
// makes SECTION_MAX 13 and the overall 78.
for (const key of SECTION_ORDER) {
  const qs = QUESTIONS.filter((q) => q.section === key);
  assert.equal(qs.length, 3, `${key} must have 3 questions`);
  assert.equal(
    qs.filter((q) => q.kind === "likert").length,
    1,
    `${key} must have exactly 1 likert`
  );
  const max = qs.reduce((sum, q) => sum + optionCount(q), 0);
  assert.equal(max, SECTION_MAX, `${key} maxes at ${max}, expected 13`);
}

for (const q of QUESTIONS) {
  assert.ok(q.text.length > 20, `question too short: ${q.text}`);
  if (q.kind === "choice") {
    assert.equal(q.options.length, 4, `4 options expected: ${q.text}`);
    assert.equal(
      new Set(q.options).size,
      4,
      `duplicate option labels: ${q.text}`
    );
  } else {
    assert.ok(q.low.length > 0 && q.high.length > 0, `likert ends: ${q.text}`);
  }
}

const totalMax = QUESTIONS.reduce((sum, q) => sum + optionCount(q), 0);
assert.equal(totalMax, ROLE_CLARITY_MAX);
assert.equal(QUESTIONS.length, ROLE_CLARITY_MIN);

// ── Q18 ordering bug fix ─────────────────────────────────────
// The prototype listed "Not sure how to tell the difference" last, so the
// weakest answer scored 4 and 78/78 was only reachable by admitting confusion.
const q18 = QUESTIONS[17];
assert.equal(q18.kind, "choice");
if (q18.kind === "choice") {
  assert.equal(
    q18.options[0],
    "Not sure how to tell the difference",
    "Q18's weakest answer must sit at index 0, or it scores highest"
  );
}

// ── Score fixtures, measured from the prototype ──────────────
const fill = (v: number): RoleClarityAnswers =>
  Object.fromEntries(QUESTIONS.map((_, i) => [i, v]));

/** All-lowest. */
assert.equal(scoreRoleClarity(fill(0)).overall, 18);

/** All second-from-bottom. */
assert.equal(scoreRoleClarity(fill(1)).overall, 36);

/**
 * The mid run: third option everywhere except Q8 and Q18, which were answered
 * one step lower. Rendered "Overall score: 52 / 78" with sections
 * 9/9/8/9/9/8 — asserted below, because the section split is what proves the
 * per-question mapping rather than just the total.
 */
const mid = { ...fill(2), 7: 1, 17: 1 };
const midResult = scoreRoleClarity(mid);
assert.equal(midResult.overall, 52);
assert.deepEqual(midResult.sections, {
  title: 9,
  scope: 9,
  company: 8,
  industry: 9,
  leadership: 9,
  market: 8,
});
assert.equal(midResult.weakest, "company", "ties break on SECTION_ORDER");

/**
 * The near-max run: top option everywhere except Q18, answered one step down.
 * Rendered 77/78 — under the prototype's ordering the missing point required
 * picking "Not sure", which is the bug fixed above.
 */
const nearMax: RoleClarityAnswers = Object.fromEntries(
  QUESTIONS.map((q, i) => [i, optionCount(q) - 1])
);
assert.equal(scoreRoleClarity(nearMax).overall, 78);
assert.equal(scoreRoleClarity({ ...nearMax, 17: 2 }).overall, 77);

// ── Weakest-section tie-break ────────────────────────────────
// All sections equal → first in SECTION_ORDER wins. Verified against the
// all-lowest run, which highlighted Title & Positioning Clarity.
assert.equal(scoreRoleClarity(fill(0)).weakest, "title");
assert.equal(scoreRoleClarity(fill(2)).weakest, "title");

// ── Bands ────────────────────────────────────────────────────
assert.equal(bandFor(18).key, "searching");
assert.equal(bandFor(36).key, "warmer");
assert.equal(bandFor(52).key, "warmer");
assert.equal(bandFor(77).key, "dialed");
assert.equal(bandFor(78).key, "dialed");
// Every score in range lands in exactly one band.
for (let n = ROLE_CLARITY_MIN; n <= ROLE_CLARITY_MAX; n++) {
  assert.ok(bandFor(n), `no band for ${n}`);
}

// ── Normalisation ────────────────────────────────────────────
assert.equal(normalise(18), 0);
assert.equal(normalise(78), 100);
// The one that matters: an all-middle answer must read as weak (< 60) so the
// dashboard prescribes against it. Dividing by 78 would give 67 and it wouldn't.
assert.equal(normalise(52), 57);
assert.ok(normalise(52) < 60, "all-middle must trip the WEAK cutoff");

console.log("role-clarity.check.ts — all assertions passed");
