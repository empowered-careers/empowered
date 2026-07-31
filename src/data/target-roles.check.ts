/**
 * Role list parse/dedupe self-check. Run: `npx tsx src/data/target-roles.check.ts`
 * ponytail: one runnable check for the comma round-trip, no test framework.
 */
import assert from "node:assert";

import { parseRoles, TARGET_ROLES, withRole } from "./target-roles";

// Round-trip: join → parse is lossless, and tolerates sloppy spacing/empties.
assert.deepEqual(parseRoles(""), []);
assert.deepEqual(parseRoles("  ,, "), []);
assert.deepEqual(parseRoles("Staff Engineer,  Director of Engineering ,"), [
  "Staff Engineer",
  "Director of Engineering",
]);

// Dedupe is case-insensitive; custom (free-text) roles are kept as typed.
assert.deepEqual(withRole([], "Product Manager"), ["Product Manager"]);
assert.deepEqual(withRole(["Product Manager"], "product manager"), [
  "Product Manager",
]);
assert.deepEqual(withRole(["Product Manager"], "  "), ["Product Manager"]);
assert.deepEqual(withRole(["Product Manager"], "Chief Vibes Officer"), [
  "Product Manager",
  "Chief Vibes Officer",
]);

// A comma in a suggestion would break the round-trip — none may contain one.
const withComma = TARGET_ROLES.filter((r) => r.includes(","));
assert.deepEqual(withComma, [], `suggestions must not contain commas`);

console.log("target-roles OK:", TARGET_ROLES.length, "suggestions");
