import assert from "node:assert";
import { createHmac } from "node:crypto";

import {
  attendeeEmail,
  bookingSlug,
  durationMinutes,
  matchEnrollment,
  signatureMatches,
  statusForTrigger,
} from "./cal";

// Run: npx tsx src/lib/cal.check.ts

// ── signature ────────────────────────────────────────────────
const SECRET = "whsec_test";
const BODY = '{"triggerEvent":"BOOKING_CREATED"}';
const good = createHmac("sha256", SECRET).update(BODY).digest("hex");

assert.equal(signatureMatches(BODY, good, SECRET), true, "valid signature");
assert.equal(
  signatureMatches(BODY, good, "wrong_secret"),
  false,
  "wrong secret rejected"
);
assert.equal(
  signatureMatches(`${BODY} `, good, SECRET),
  false,
  "tampered body rejected"
);
assert.equal(signatureMatches(BODY, "", SECRET), false, "empty sig rejected");
// The length guard exists because timingSafeEqual throws on mismatched lengths —
// this would be a 500 (and a retry storm) rather than a clean 400 without it.
assert.doesNotThrow(
  () => signatureMatches(BODY, "abc", SECRET),
  "short sig must not throw"
);
assert.equal(
  signatureMatches(BODY, good.toUpperCase(), SECRET),
  false,
  "hex is case-sensitive"
);

// ── trigger → status ─────────────────────────────────────────
assert.equal(statusForTrigger("BOOKING_CREATED"), "scheduled");
assert.equal(statusForTrigger("BOOKING_RESCHEDULED"), "scheduled");
assert.equal(statusForTrigger("BOOKING_CANCELLED"), "canceled");
assert.equal(statusForTrigger("MEETING_ENDED"), undefined, "unknown → ignored");
assert.equal(statusForTrigger(undefined), undefined);

// ── duration ─────────────────────────────────────────────────
assert.equal(
  durationMinutes("2026-09-01T14:00:00Z", "2026-09-01T14:50:00Z"),
  50
);
assert.equal(durationMinutes("2026-09-01T14:00:00Z", undefined), null);
assert.equal(
  durationMinutes("2026-09-01T15:00:00Z", "2026-09-01T14:00:00Z"),
  null,
  "end before start → null, not negative"
);
assert.equal(durationMinutes("nonsense", "also nonsense"), null);

// ── enrollment matching ──────────────────────────────────────
const RESUME = { id: "e1", bookingUrl: "https://cal.com/ec/resume-refresh" };
const MOCK = { id: "e2", bookingUrl: "https://cal.com/ec/mock-interview" };
const BUNDLE = { id: "e3", bookingUrl: null };

assert.equal(
  matchEnrollment([RESUME, MOCK, BUNDLE], "mock-interview")?.id,
  "e2",
  "slug picks the right one out of several"
);
assert.equal(
  matchEnrollment([RESUME, BUNDLE], "")?.id,
  "e1",
  "no slug but exactly one bookable → unambiguous"
);
assert.equal(
  matchEnrollment([RESUME, MOCK], ""),
  null,
  "no slug and two bookable → refuse to guess"
);
assert.equal(
  matchEnrollment([RESUME, MOCK], "no-such-event"),
  null,
  "slug matches nothing and several bookable → refuse to guess"
);
assert.equal(
  matchEnrollment([BUNDLE], "anything"),
  null,
  "a bundle alone has no booking link to match"
);
assert.equal(matchEnrollment([], "x"), null, "no enrollments → null");
// Both URLs contain "interview"; ambiguity must not silently pick the first.
assert.equal(
  matchEnrollment(
    [
      { id: "a", bookingUrl: "https://cal.com/ec/interview-prep" },
      { id: "b", bookingUrl: "https://cal.com/ec/interview-debrief" },
    ],
    "interview"
  ),
  null,
  "ambiguous slug substring → null"
);

// ── payload accessors ────────────────────────────────────────
assert.equal(
  attendeeEmail({ attendees: [{ email: "GT@Empowered-Careers.com" }] }),
  "gt@empowered-careers.com",
  "email lowercased for matching"
);
assert.equal(attendeeEmail({}), null);
assert.equal(attendeeEmail({ attendees: [{}] }), null);
assert.equal(bookingSlug({ eventType: { slug: "a" }, type: "b" }), "a");
assert.equal(bookingSlug({ type: "b" }), "b", "falls back to type");
assert.equal(bookingSlug({}), "");

console.log("cal OK: signature, triggers, duration, enrollment matching");
