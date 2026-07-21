/**
 * Scoring parity self-check. Run: `npx tsx src/lib/assessment/career-positioning.check.ts`
 * ponytail: one runnable check for the scoring math, no test framework.
 */
import assert from "node:assert";

import { computeResults, QUESTIONS } from "./career-positioning";

// All answers at max → 100%, top tier.
const allMax: Record<number, number> = {};
QUESTIONS.forEach((q) => {
  allMax[q.id] = q.type === "scale" ? 5 : 4;
});
const max = computeResults(allMax);
assert.equal(max.overallPct, 100, "all-max should score 100%");
assert.equal(max.tier.name, "Market Ready");

// All answers at min → 23% (18 pts / 79 max), reset tier.
const allMin: Record<number, number> = {};
QUESTIONS.forEach((q) => {
  allMin[q.id] = 1;
});
const min = computeResults(allMin);
assert.equal(min.overallPct, 23, "all-min should score 23%");
assert.equal(min.tier.name, "Search Reset Needed");
// `worth` has two scale questions (max 14 vs 13), so it scores lowest at min.
assert.equal(min.lowestCategory, "worth");

console.log("career-positioning scoring OK:", {
  max: max.overallPct,
  min: min.overallPct,
});
