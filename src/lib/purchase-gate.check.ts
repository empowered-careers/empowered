import assert from "node:assert";

import { needsPurchase, purchaseGateEnabled } from "./purchase-gate";

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

console.log("purchase-gate.check.ts OK");
