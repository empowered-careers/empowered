import assert from "node:assert";

import { type FailureReport, summariseFailures } from "./job-failures";

// Run: npx tsx src/lib/job-failures.check.ts

const none: FailureReport = {
  resumeFailed: 0,
  resumeStuck: 0,
  linkedinFailed: 0,
  linkedinStuck: 0,
};

// ── silence only when genuinely clean ─────────────────────────
// The whole value of this sweep is that it refuses to stay quiet. A zero total
// is the single condition that suppresses the alert, so it had better require
// all four counters to be zero.
assert.equal(summariseFailures(none).total, 0, "all-zero must be silent");

for (const key of Object.keys(none) as (keyof FailureReport)[]) {
  assert.equal(
    summariseFailures({ ...none, [key]: 1 }).total,
    1,
    `a single ${key} must break silence`
  );
}

// ── counts are summed, not overwritten ────────────────────────
// Guards the copy-paste slip of adding the same field twice, which would
// under-report exactly the September scenario: failed resumes alongside
// stuck LinkedIn rows.
assert.equal(
  summariseFailures({
    resumeFailed: 7,
    resumeStuck: 2,
    linkedinFailed: 3,
    linkedinStuck: 1,
  }).total,
  13,
  "total must sum all four counters"
);

// ── the summary carries the numbers a human needs ─────────────
// "Something failed" is not actionable. "7 resume failed" tells you whether
// it's one bad PDF or the parser being down.
const { summary } = summariseFailures({
  resumeFailed: 7,
  resumeStuck: 0,
  linkedinFailed: 3,
  linkedinStuck: 0,
});
assert.match(summary, /7 resume failed/, "summary names the resume count");
assert.match(summary, /3 LinkedIn failed/, "summary names the LinkedIn count");

console.log("job-failures: all checks passed");
