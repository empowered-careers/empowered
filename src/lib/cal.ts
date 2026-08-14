import { createHmac, timingSafeEqual } from "node:crypto";

import type { CoachingSessionStatus } from "@/types/db";

/**
 * Pure helpers for the Cal.com booking webhook. They live here rather than in
 * the route so the signature check and the enrollment matcher can be exercised
 * by `cal.check.ts` — getting either wrong is either a security hole or a
 * session attached to the wrong purchase.
 */

export interface CalBooking {
  uid?: string;
  startTime?: string;
  endTime?: string;
  type?: string;
  eventType?: { slug?: string };
  attendees?: { email?: string }[];
}

export interface CalWebhookBody {
  triggerEvent?: string;
  payload?: CalBooking;
}

const STATUS_BY_TRIGGER: Record<string, CoachingSessionStatus> = {
  BOOKING_CREATED: "scheduled",
  BOOKING_RESCHEDULED: "scheduled",
  BOOKING_CANCELLED: "canceled",
};

/** Undefined for triggers we don't handle — the route acks those without acting. */
export function statusForTrigger(
  trigger: string | undefined
): CoachingSessionStatus | undefined {
  return trigger ? STATUS_BY_TRIGGER[trigger] : undefined;
}

/** HMAC-SHA256 of the raw body, hex, compared in constant time. */
export function signatureMatches(
  body: string,
  header: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(header, "utf8");
  // timingSafeEqual throws on a length mismatch, so compare lengths first.
  return a.length === b.length && timingSafeEqual(a, b);
}

export function durationMinutes(
  start: string | undefined,
  end: string | undefined
): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 60000) : null;
}

export interface BookableEnrollment {
  id: string;
  bookingUrl: string | null;
}

/**
 * Which enrollment does this booking belong to?
 *
 * `coaching_sessions.enrollment_id` is NOT NULL, so an unresolvable booking must
 * be dropped rather than guessed — a missing row beats one filed against the
 * wrong purchase. Slug match wins; a single bookable enrollment is unambiguous
 * enough to take; anything else returns null.
 *
 * ponytail: if candidates routinely hold several bookable enrollments with no
 * slug match, pass the enrollment id through Cal.com booking metadata instead of
 * widening this heuristic.
 */
export function matchEnrollment(
  candidates: BookableEnrollment[],
  slug: string
): BookableEnrollment | null {
  const bookable = candidates.filter((c) => c.bookingUrl);
  if (slug) {
    const bySlug = bookable.filter((c) => c.bookingUrl?.includes(slug));
    // Two products sharing a slug substring is ambiguous, not a match.
    if (bySlug.length === 1) return bySlug[0];
    if (bySlug.length > 1) return null;
  }
  return bookable.length === 1 ? bookable[0] : null;
}

/** The attendee we key the profile lookup on. */
export function attendeeEmail(booking: CalBooking): string | null {
  return booking.attendees?.[0]?.email?.toLowerCase() ?? null;
}

export function bookingSlug(booking: CalBooking): string {
  return booking.eventType?.slug ?? booking.type ?? "";
}
