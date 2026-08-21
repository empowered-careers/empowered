/**
 * Big Wins content + routing + overlay self-check.
 * Run: `npx tsx src/lib/assessment/big-wins.check.ts`
 * ponytail: one runnable check for the non-trivial logic, no test framework.
 */
import assert from "node:assert";

import {
  type BigWinsResult,
  CATEGORIES,
  categoriesForTitle,
  CATEGORY_ORDER,
  hasNumber,
  mergeRoleBullets,
  roleKey,
  rolesFromParsed,
  unbackedNumbers,
  vaguenessNudge,
} from "./big-wins";

// ── Content completeness ─────────────────────────────────────
assert.equal(CATEGORY_ORDER.length, 9);
for (const key of CATEGORY_ORDER) {
  const c = CATEGORIES[key];
  assert.ok(c, `missing category ${key}`);
  assert.equal(c.key, key, `category ${key} has mismatched key`);
  assert.ok(c.label.length > 0, `${key} missing label`);
  assert.ok(c.ask.length > 20, `${key} missing ask`);
  assert.ok(c.dig.length > 20, `${key} missing dig`);
  assert.ok(c.flip.before.length > 0 && c.flip.after.length > 0, `${key} flip`);
  assert.ok(hasNumber(c.flip.after), `${key} example flip must be quantified`);
}

// ── Section 3 routing: one title per row of the mapping table ─
const ROUTING: [string, string[]][] = [
  ["Account Executive", ["A", "F", "I", "C", "E"]], // Sales
  ["Growth Marketer", ["A", "H", "D", "C", "E"]], // Marketing
  ["Supply Chain Analyst", ["B", "E", "C", "D"]], // Operations
  ["Customer Success Specialist", ["F", "D", "B", "G"]], // Customer Success
  ["Staff Software Engineer", ["D", "E", "C", "H", "B"]], // Engineering
  ["Financial Controller", ["B", "C", "D", "A"]], // Finance — "Controller"
  ["Technical Recruiter", ["G", "E", "F", "B"]], // HR
  ["Director of Marketing", ["G", "C", "A", "I"]], // Directors+ → G, C, fn top
  ["Junior Data Analyst", ["D", "E", "I", "C"]], // Early-career IC
  ["Chief of Staff", ["G", "C", "A", "I"]], // Senior, no function match
  ["Zookeeper", ["A", "B", "C", "D"]], // Unclassifiable → spec default
];

for (const [title, expected] of ROUTING) {
  const { initial, more } = categoriesForTitle(title);
  assert.deepEqual(
    initial,
    expected,
    `"${title}" routed to ${initial.join("")}, expected ${expected.join("")}`
  );
  assert.ok(
    initial.length >= 4 && initial.length <= 6,
    `"${title}" surfaced ${initial.length} questions, spec says 4–6`
  );
  assert.equal(
    new Set([...initial, ...more]).size,
    9,
    `"${title}" initial+more must cover all 9 categories exactly once`
  );
}

// ── Section 4 nudges ─────────────────────────────────────────
assert.equal(
  vaguenessNudge("Cut churn by 12% in two quarters"),
  null,
  "already-quantified answers get no nudge"
);
assert.equal(vaguenessNudge("   "), null, "empty answers get no nudge");
assert.ok(
  vaguenessNudge("I helped improve the onboarding flow")?.includes("percentage")
);
assert.ok(vaguenessNudge("Managed a big team")?.includes("headcount"));
assert.ok(
  vaguenessNudge("Honestly I don't have any numbers")?.includes("range")
);
assert.ok(
  vaguenessNudge("Rewrote the deployment scripts")?.includes("number"),
  "unmatched but unquantified answers still get the generic nudge"
);
assert.ok(hasNumber("doubled the pipeline"), "spelled-out magnitudes count");

// ── Overlay merge ────────────────────────────────────────────
const parsed = [
  {
    company: "Acme",
    title: "Engineer",
    start: null,
    end: null,
    bullets: ["old a"],
  },
  {
    company: "Globex",
    title: "Lead",
    start: null,
    end: null,
    bullets: ["old b"],
  },
];
const roles = rolesFromParsed(parsed);
assert.equal(roles[0].key, "acme|engineer", "role keys are normalised");
assert.equal(
  roleKey(" ACME ", "Engineer"),
  roles[0].key,
  "keys survive casing and whitespace differences"
);

const result: BigWinsResult = {
  roles: {
    "acme|engineer": { bullets: ["new a"], polished_at: "2026-01-01" },
    "initech|analyst": { bullets: ["orphan"], polished_at: "2025-01-01" },
  },
};
const merged = mergeRoleBullets(roles, result);

assert.deepEqual(merged[0].bullets, ["new a"], "overlay wins where present");
assert.equal(merged[0].rewritten, true);
assert.deepEqual(
  merged[1].bullets,
  ["old b"],
  "untouched roles keep parser bullets"
);
assert.equal(merged[1].rewritten, false);
assert.equal(
  merged.length,
  3,
  "an overlay role missing from the resume is kept"
);
assert.equal(merged[2].orphaned, true);
assert.equal(merged[2].company, "initech");

// No overlay at all → pure passthrough, nothing dropped.
const bare = mergeRoleBullets(roles, null);
assert.equal(bare.length, 2);
assert.deepEqual(
  bare.map((r) => r.bullets),
  [["old a"], ["old b"]]
);
assert.ok(bare.every((r) => !r.rewritten && !r.orphaned));

// An empty rewrite must not blank out the original bullets.
const emptied = mergeRoleBullets(roles, {
  roles: { "acme|engineer": { bullets: [], polished_at: "2026-01-01" } },
});
assert.deepEqual(emptied[0].bullets, ["old a"]);
assert.equal(emptied[0].rewritten, false);
assert.equal(emptied.length, 2, "empty overlay entries are not surfaced");

// ── Numeric provenance: the "never invent a number" rule ─────
{
  const src = [
    "We cut invoicing from 5 days to 1 and saved about $40,000 a year",
    "Churn dropped roughly 15% across a 12-person team",
  ];
  const backed = (b: string) => unbackedNumbers(b, src);

  assert.deepEqual(
    backed("Cut invoicing from 5 days to 1, saving $40,000 annually"),
    [],
    "figures present verbatim are backed"
  );
  assert.deepEqual(
    backed("Saved $40K a year in labor hours"),
    [],
    "40K matches 40,000 across formatting"
  );
  assert.deepEqual(
    backed("Reduced churn by roughly 15% on a 12-person team"),
    [],
    "hedged figures stay backed"
  );
  assert.deepEqual(
    backed("Managed a $2.4M portfolio of 18 enterprise accounts"),
    ["2.4M", "18"],
    "figures absent from the answers are flagged"
  );
  assert.deepEqual(
    backed("Rebuilt the escalation process end to end"),
    [],
    "a bullet with no figures is never flagged"
  );
  assert.deepEqual(
    unbackedNumbers("Grew revenue 3x", ["tripled revenue, roughly 3x"]),
    [],
    "multipliers compare on their own token"
  );
  assert.deepEqual(
    unbackedNumbers("Cut costs 40%", ["saved $40,000"]),
    ["40%"],
    "a percentage does not match a same-digit dollar figure"
  );
}

console.log("big-wins OK:", {
  categories: CATEGORY_ORDER.length,
  routesChecked: ROUTING.length,
});
