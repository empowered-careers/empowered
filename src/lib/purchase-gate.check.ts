import assert from "node:assert";

import {
  matchesInviteCode,
  needsPurchase,
  purchaseGateEnabled,
} from "./purchase-gate";

// Run: npx tsx src/lib/purchase-gate.check.ts

// ── gate off = fully inert ────────────────────────────────────
// The whole point of the flag: with it off, nobody is ever gated, whatever
// their role or entitlement.
for (const isAdmin of [true, false]) {
  for (const hasEnrollment of [true, false]) {
    assert.equal(
      needsPurchase({ enabled: false, isAdmin, hasEnrollment }),
      false,
      `gate off must never gate (isAdmin=${isAdmin}, hasEnrollment=${hasEnrollment})`
    );
  }
}

// ── gate on ──────────────────────────────────────────────────
assert.equal(
  needsPurchase({ enabled: true, isAdmin: false, hasEnrollment: false }),
  true,
  "no enrollment → must buy"
);
assert.equal(
  needsPurchase({ enabled: true, isAdmin: false, hasEnrollment: true }),
  false,
  "enrollment → in"
);
assert.equal(
  needsPurchase({ enabled: true, isAdmin: true, hasEnrollment: false }),
  false,
  "admin bypasses even with nothing bought — otherwise enabling the gate locks out the operator"
);

// ── flag parsing ─────────────────────────────────────────────
// Anything other than exactly "true" leaves the gate closed-off, so a typo or a
// leftover "false"/"0" in Vercel can't lock the whole app.
const original = process.env.PURCHASE_GATE_ENABLED;
for (const value of [undefined, "", "false", "0", "TRUE", "yes"]) {
  if (value === undefined) delete process.env.PURCHASE_GATE_ENABLED;
  else process.env.PURCHASE_GATE_ENABLED = value;
  assert.equal(
    purchaseGateEnabled(),
    false,
    `${JSON.stringify(value)} must not enable the gate`
  );
}
process.env.PURCHASE_GATE_ENABLED = "true";
assert.equal(purchaseGateEnabled(), true, '"true" enables the gate');
if (original === undefined) delete process.env.PURCHASE_GATE_ENABLED;
else process.env.PURCHASE_GATE_ENABLED = original;

// ── invite code ──────────────────────────────────────────────
assert.equal(matchesInviteCode("ECTEST100", "ECTEST100"), true, "exact match");
assert.equal(
  matchesInviteCode("  ectest100 ", "ECTEST100"),
  true,
  "pasted out of an email: whitespace and case must not matter"
);
assert.equal(matchesInviteCode("ECTEST101", "ECTEST100"), false, "wrong code");
// No configured code must be unredeemable, including by the empty string —
// otherwise every signed-in user walks through a blank form.
for (const input of ["", "   ", "ECTEST100"]) {
  assert.equal(
    matchesInviteCode(input, undefined),
    false,
    `no code configured → ${JSON.stringify(input)} must not match`
  );
  assert.equal(
    matchesInviteCode(input, "  "),
    false,
    `blank code configured → ${JSON.stringify(input)} must not match`
  );
}

console.log("purchase-gate.check.ts OK");
