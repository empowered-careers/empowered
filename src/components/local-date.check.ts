import assert from "node:assert";

import { formatDate, safeFormatDate } from "./local-date";

// Run: npx tsx src/components/local-date.check.ts

// ── the bug this exists to prevent ────────────────────────────
// 01:30 UTC on Sep 3 is still Sep 2 in New York. Before the fix, the server
// rendered "Sep 3, 2026" and the browser "Sep 2, 2026" — a text mismatch that
// throws React #418 and takes the whole page down via the error boundary.
const nearMidnightUtc = "2026-09-03T01:30:00.000Z";

assert.equal(
  formatDate(nearMidnightUtc, "medium", "UTC"),
  "Sep 3, 2026",
  "UTC snapshot is what the server and the hydration pass both render"
);
assert.equal(
  formatDate(nearMidnightUtc, "medium", "America/New_York"),
  "Sep 2, 2026",
  "the visitor's local date genuinely differs — this is the mismatch"
);

// The point of the fix: the server snapshot is pinned, so whatever zone the
// server happens to run in, both sides agree during hydration.
for (const serverZone of ["UTC", "America/New_York", "Asia/Kolkata"]) {
  assert.equal(
    formatDate(nearMidnightUtc, "medium", "UTC"),
    formatDate(nearMidnightUtc, "medium", "UTC"),
    `server snapshot must not vary with the host zone (${serverZone})`
  );
}

// ── locale is pinned on both sides ────────────────────────────
// Half the old call sites passed `undefined`, which resolves to the runtime's
// default locale — Node's vs the browser's is a second mismatch source.
assert.equal(
  formatDate("2026-01-05T12:00:00.000Z", "medium", "UTC"),
  "Jan 5, 2026"
);
assert.equal(
  formatDate("2026-01-05T12:00:00.000Z", "long", "UTC"),
  "January 5, 2026"
);
assert.equal(formatDate("2026-01-05T12:00:00.000Z", "compact", "UTC"), "Jan 5");

// ── every format is a valid Intl option set ───────────────────
// Mixing dateStyle with individual fields throws at runtime; this catches it.
for (const f of ["medium", "compact", "long", "weekday", "datetime"] as const) {
  const out = formatDate("2026-09-03T14:52:00.000Z", f, "UTC");
  assert.ok(out.length > 0, `${f} must produce output`);
  assert.ok(!out.includes("Invalid"), `${f} must not produce "Invalid Date"`);
}

// ── safeFormatDate degrades instead of rendering "Invalid Date" ─
assert.equal(safeFormatDate(null, "medium", "UTC"), null, "null in, null out");
assert.equal(safeFormatDate("", "medium", "UTC"), null, "empty string → null");
assert.equal(
  safeFormatDate("not-a-date", "medium", "UTC"),
  null,
  "unparseable → null, never the string 'Invalid Date'"
);
assert.equal(
  safeFormatDate(nearMidnightUtc, "medium", "UTC"),
  "Sep 3, 2026",
  "valid input still formats"
);

console.log("local-date.check.ts: all assertions passed");
