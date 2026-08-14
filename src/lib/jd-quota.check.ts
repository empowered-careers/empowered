import assert from "node:assert";

import { FREE_JD_PER_MONTH, monthStartIso, quotaState } from "./jd-quota";

// Run: npx tsx src/lib/jd-quota.check.ts

// ── month boundary ───────────────────────────────────────────
// Mid-month, first instant, and last instant must all resolve to the same start.
assert.equal(
  monthStartIso(new Date("2026-08-15T13:45:12.000Z")),
  "2026-08-01T00:00:00.000Z"
);
assert.equal(
  monthStartIso(new Date("2026-08-01T00:00:00.000Z")),
  "2026-08-01T00:00:00.000Z",
  "first instant of the month counts as in-month"
);
assert.equal(
  monthStartIso(new Date("2026-08-31T23:59:59.999Z")),
  "2026-08-01T00:00:00.000Z",
  "last instant of the month still points at the 1st"
);
// January must not roll back into the previous year's December.
assert.equal(
  monthStartIso(new Date("2027-01-04T09:00:00.000Z")),
  "2027-01-01T00:00:00.000Z"
);
// December must not roll forward.
assert.equal(
  monthStartIso(new Date("2026-12-31T22:00:00.000Z")),
  "2026-12-01T00:00:00.000Z"
);
// A leap February resolves normally.
assert.equal(
  monthStartIso(new Date("2028-02-29T12:00:00.000Z")),
  "2028-02-01T00:00:00.000Z"
);

// ── free quota ───────────────────────────────────────────────
assert.equal(FREE_JD_PER_MONTH, 5, "the resolved decision is 5/month");

const fresh = quotaState(0, false);
assert.deepEqual(fresh, {
  used: 0,
  limit: 5,
  remaining: 5,
  exhausted: false,
});

assert.equal(quotaState(4, false).remaining, 1, "4 used → 1 left");
assert.equal(quotaState(4, false).exhausted, false);

const spent = quotaState(5, false);
assert.equal(spent.remaining, 0);
assert.equal(spent.exhausted, true, "the 6th free check is refused");

// Over-count must clamp, not go negative — a negative remaining would read as
// truthy-positive in a `remaining > 0` guard somewhere downstream.
const over = quotaState(9, false);
assert.equal(over.remaining, 0);
assert.equal(over.exhausted, true);
// Defensive: a bad count from the DB must not hand out free checks.
assert.equal(quotaState(-3, false).used, 0);
assert.equal(quotaState(-3, false).remaining, 5);

// ── unlimited (owns an enrollment) ───────────────────────────
const paid = quotaState(400, true);
assert.equal(paid.exhausted, false, "enrollment holders are never blocked");
assert.equal(paid.remaining, Number.POSITIVE_INFINITY);
assert.equal(quotaState(0, true).exhausted, false);

console.log(
  `jd-quota OK: month boundaries + ${FREE_JD_PER_MONTH}/month free, unlimited when enrolled`
);
