import assert from "node:assert";
import { createHmac } from "node:crypto";

import {
  durationMinutes,
  inviteeEmail,
  matchEnrollment,
  parseSignatureHeader,
  rescheduledFrom,
  signatureMatches,
  statusForEvent,
} from "./calendly";

// Run: npx tsx src/lib/calendly.check.ts

// ── signature ────────────────────────────────────────────────
const SECRET = "whsec_test";
const BODY = '{"event":"invitee.created"}';
const NOW_MS = 1_700_000_000_000;
const T = String(NOW_MS / 1000);
const sign = (ts: string, body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
const header = (ts: string, body: string, secret = SECRET) =>
  `t=${ts},v1=${sign(ts, body, secret)}`;

assert.equal(
  signatureMatches(BODY, header(T, BODY), SECRET, NOW_MS),
  true,
  "valid signature"
);
assert.equal(
  signatureMatches(BODY, header(T, BODY), "wrong_secret", NOW_MS),
  false,
  "wrong secret rejected"
);
assert.equal(
  signatureMatches(`${BODY} `, header(T, BODY), SECRET, NOW_MS),
  false,
  "tampered body rejected"
);
// The timestamp is inside the signed string, so restamping invalidates it —
// this is what stops a captured request being replayed with a fresh `t`.
assert.equal(
  signatureMatches(BODY, `t=${T},v1=${sign("1", BODY)}`, SECRET, NOW_MS),
  false,
  "signature computed over a different timestamp rejected"
);
assert.equal(
  signatureMatches(BODY, header(T, BODY), SECRET, NOW_MS + 600_000),
  false,
  "stale timestamp rejected"
);
assert.equal(
  signatureMatches(BODY, "v1=abc", SECRET, NOW_MS),
  false,
  "missing timestamp rejected"
);
assert.equal(
  signatureMatches(BODY, "", SECRET, NOW_MS),
  false,
  "empty header rejected"
);
// timingSafeEqual throws on mismatched lengths — a 500 and a retry storm
// instead of a clean 400 without the length guard.
assert.doesNotThrow(
  () => signatureMatches(BODY, `t=${T},v1=abc`, SECRET, NOW_MS),
  "short sig must not throw"
);
assert.equal(
  signatureMatches(BODY, header(T, BODY).toUpperCase(), SECRET, NOW_MS),
  false,
  "case-shifted digest rejected"
);

// ── header parsing ───────────────────────────────────────────
assert.deepEqual(parseSignatureHeader("t=123,v1=abc"), {
  timestamp: "123",
  signature: "abc",
});
assert.deepEqual(
  parseSignatureHeader("v1=abc, t=123"),
  { timestamp: "123", signature: "abc" },
  "order and spacing independent"
);
assert.equal(parseSignatureHeader("t=123"), null, "digest required");

// ── event → status ───────────────────────────────────────────
assert.equal(statusForEvent("invitee.created"), "scheduled");
assert.equal(statusForEvent("invitee.canceled"), "canceled");
assert.equal(statusForEvent("invitee_no_show.created"), undefined);
assert.equal(statusForEvent(undefined), undefined);

// ── duration ─────────────────────────────────────────────────
assert.equal(
  durationMinutes("2026-01-01T10:00:00Z", "2026-01-01T10:30:00Z"),
  30
);
assert.equal(durationMinutes("2026-01-01T10:00:00Z", undefined), null);
assert.equal(
  durationMinutes("2026-01-01T10:30:00Z", "2026-01-01T10:00:00Z"),
  null,
  "end before start is not a duration"
);

// ── reschedule ───────────────────────────────────────────────
assert.equal(
  rescheduledFrom({ rescheduled: true, old_invitee: "uri/old" }),
  "uri/old"
);
assert.equal(
  rescheduledFrom({ rescheduled: false, old_invitee: "uri/old" }),
  null
);
assert.equal(rescheduledFrom({}), null);

// ── enrollment matching ──────────────────────────────────────
const URL = "https://calendly.com/lauren-empowered-careers/30min";
const three = [
  { id: "e1", bookingUrl: URL },
  { id: "e2", bookingUrl: URL },
  { id: "e3", bookingUrl: null },
];

assert.equal(matchEnrollment(three, "e2")?.id, "e2", "utm_content wins");
// The whole reason utm_content exists: a bundle grants several session
// enrollments that all share one Calendly URL, so nothing else can tell them
// apart and every booking would be dropped.
assert.equal(
  matchEnrollment(three, null),
  null,
  "two bookable enrollments, no tag → ambiguous, drop"
);
assert.equal(
  matchEnrollment(three, "e3"),
  null,
  "tagged enrollment with no booking_url is not bookable"
);
assert.equal(
  matchEnrollment(three, "not-mine"),
  null,
  "tag naming an enrollment this profile lacks does not match"
);
assert.equal(
  matchEnrollment([{ id: "solo", bookingUrl: URL }], null)?.id,
  "solo",
  "sole bookable enrollment is unambiguous"
);
assert.equal(matchEnrollment([], "e1"), null, "no enrollments");

// ── email ────────────────────────────────────────────────────
assert.equal(inviteeEmail({ email: "A@B.com" }), "a@b.com", "lowercased");
assert.equal(inviteeEmail({}), null);

console.log("calendly.check.ts: all assertions passed");
