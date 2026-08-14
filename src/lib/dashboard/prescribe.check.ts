import assert from "node:assert";

import {
  type CatalogOption,
  prescribe,
  type PrescriptionSignals,
} from "./prescribe";

// Run: npx tsx src/lib/dashboard/prescribe.check.ts

// The seeded catalog (names must match the seed migration exactly — a rename in
// admin silently disables the matching rule, which is the behaviour asserted at
// the bottom).
const CATALOG: CatalogOption[] = [
  {
    id: "p-resume",
    name: "Resume Refresh",
    kind: "session",
    price_cents: 12500,
  },
  {
    id: "p-linkedin",
    name: "LinkedIn Glow-Up",
    kind: "session",
    price_cents: 15000,
  },
  {
    id: "p-northstar",
    name: "NorthStar Discovery",
    kind: "session",
    price_cents: 17500,
  },
  {
    id: "p-intel",
    name: "Market Intel Session",
    kind: "session",
    price_cents: 17500,
  },
  { id: "p-mock", name: "Mock Interview", kind: "session", price_cents: 20000 },
  { id: "p-bio", name: "Executive Bio", kind: "session", price_cents: 25000 },
];

const BLANK: PrescriptionSignals = {
  scores: null,
  resumeScore: null,
  linkedinScore: null,
  atsScore: null,
  owned: [],
};

const s = (over: Partial<PrescriptionSignals>): PrescriptionSignals => ({
  ...BLANK,
  ...over,
});

// ── nothing to say ───────────────────────────────────────────
assert.equal(prescribe(BLANK, CATALOG), null, "no signals → no upsell");
assert.equal(
  prescribe(s({ resumeScore: 88, linkedinScore: 90, atsScore: 92 }), CATALOG),
  null,
  "strong candidate with no gaps is not sold at"
);
assert.equal(
  prescribe(s({ resumeScore: 40 }), []),
  null,
  "empty catalog → null, never a dead CTA"
);

// ── single-signal rules ──────────────────────────────────────
assert.equal(
  prescribe(s({ resumeScore: 55 }), CATALOG)?.productId,
  "p-resume",
  "low resume score → Resume Refresh"
);
assert.equal(
  prescribe(s({ linkedinScore: 44 }), CATALOG)?.productId,
  "p-linkedin"
);
assert.equal(
  prescribe(s({ atsScore: 35 }), CATALOG)?.productId,
  "p-resume",
  "weak ATS match also points at the resume"
);
assert.equal(
  prescribe(s({ scores: { communication_score: 42 } }), CATALOG)?.productId,
  "p-mock"
);
assert.equal(
  prescribe(s({ scores: { role_clarity_score: 30 } }), CATALOG)?.productId,
  "p-northstar"
);
assert.equal(
  prescribe(s({ scores: { impact_score: 51 } }), CATALOG)?.productId,
  "p-intel"
);

// ── thresholds ───────────────────────────────────────────────
assert.equal(
  prescribe(s({ resumeScore: 70 }), CATALOG),
  null,
  "70 is the bar, not below it"
);
assert.equal(prescribe(s({ resumeScore: 69 }), CATALOG)?.productId, "p-resume");
assert.equal(
  prescribe(s({ scores: { communication_score: 60 } }), CATALOG),
  null,
  "60 is not weak"
);
assert.equal(
  prescribe(s({ scores: { communication_score: 59 } }), CATALOG)?.productId,
  "p-mock"
);
// A zero score is a real signal, not a missing one.
assert.equal(
  prescribe(s({ resumeScore: 0 }), CATALOG)?.productId,
  "p-resume",
  "0 must not be treated as absent"
);

// ── the strength rule ────────────────────────────────────────
assert.equal(
  prescribe(s({ scores: { leadership_score: 85 } }), CATALOG)?.productId,
  "p-bio",
  "strong leadership → Executive Bio"
);
assert.equal(
  prescribe(s({ scores: { leadership_score: 79 } }), CATALOG),
  null,
  "80 is the bar for the strength rule"
);

// ── priority between competing signals ───────────────────────
// Resume 90 beats LinkedIn 80 beats Mock 75.
assert.equal(
  prescribe(s({ resumeScore: 50, linkedinScore: 50 }), CATALOG)?.productId,
  "p-resume",
  "resume outranks LinkedIn when both are weak"
);
// Role clarity (85) beats LinkedIn (80): settle the target before the shop window.
assert.equal(
  prescribe(
    s({ linkedinScore: 50, scores: { role_clarity_score: 40 } }),
    CATALOG
  )?.productId,
  "p-northstar"
);
// Low resume score (90) is the loudest signal in the table.
assert.equal(
  prescribe(
    s({
      resumeScore: 40,
      linkedinScore: 40,
      atsScore: 20,
      scores: { role_clarity_score: 10, communication_score: 10 },
    }),
    CATALOG
  )?.productId,
  "p-resume",
  "everything weak → the highest-priority rule wins"
);

// ── never re-sell what they own ──────────────────────────────
assert.equal(
  prescribe(s({ resumeScore: 50, owned: ["Resume Refresh"] }), CATALOG),
  null,
  "already owns the fix → nothing to prescribe"
);
assert.equal(
  prescribe(
    s({ resumeScore: 50, linkedinScore: 50, owned: ["Resume Refresh"] }),
    CATALOG
  )?.productId,
  "p-linkedin",
  "falls through to the next-best unowned product"
);

// ── catalog drift ────────────────────────────────────────────
// Renamed or deactivated in admin: the rule must be skipped, not dead-linked.
const RENAMED = CATALOG.filter((p) => p.id !== "p-resume");
assert.equal(
  prescribe(s({ resumeScore: 50 }), RENAMED),
  null,
  "rule's product missing from catalog → skipped"
);
assert.equal(
  prescribe(s({ resumeScore: 50, linkedinScore: 50 }), RENAMED)?.productId,
  "p-linkedin",
  "missing product falls through to the next rule"
);

// Reasons are shown verbatim, so they must be non-empty and mention the number.
const withScore = prescribe(s({ resumeScore: 55 }), CATALOG);
assert.ok(withScore, "expected a prescription");
assert.ok(withScore.reason.includes("55"), "reason cites the actual score");
assert.ok(withScore.reason.length > 30, "reason is a real sentence");

console.log("prescribe OK: thresholds, priority, ownership, catalog drift");
