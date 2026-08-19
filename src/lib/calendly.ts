import { createHmac, timingSafeEqual } from "node:crypto";

import type { CoachingSessionStatus } from "@/types/db";

/**
 * Pure helpers for the Calendly booking webhook, mirroring `cal.ts`.
 *
 * Two things differ from Cal.com and drive the shapes below:
 *  - Calendly signs `<timestamp>.<body>`, not the body alone, and ships the
 *    timestamp and digest in one comma-separated header.
 *  - There is no reschedule trigger. A reschedule is `invitee.canceled` on the
 *    old invitee plus `invitee.created` on a *new* one, so the id we store has
 *    to be re-pointed rather than matched — see `rescheduledFrom`.
 */

export interface CalendlyInvitee {
  uri?: string;
  email?: string;
  status?: string;
  rescheduled?: boolean;
  old_invitee?: string | null;
  tracking?: { utm_content?: string | null };
  scheduled_event?: {
    start_time?: string;
    end_time?: string;
    name?: string;
  };
}

export interface CalendlyWebhookBody {
  event?: string;
  payload?: CalendlyInvitee;
}

const STATUS_BY_EVENT: Record<string, CoachingSessionStatus> = {
  "invitee.created": "scheduled",
  "invitee.canceled": "canceled",
};

/** Undefined for events we don't handle — the route acks those without acting. */
export function statusForEvent(
  event: string | undefined
): CoachingSessionStatus | undefined {
  return event ? STATUS_BY_EVENT[event] : undefined;
}

/**
 * Parse `t=1699999999,v1=<hex>` into its parts. Calendly documents the order as
 * t then v1, but the header is a set, so don't depend on position.
 */
export function parseSignatureHeader(
  header: string
): { timestamp: string; signature: string } | null {
  let timestamp = "";
  let signature = "";
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key?.trim() === "t") timestamp = value?.trim() ?? "";
    if (key?.trim() === "v1") signature = value?.trim() ?? "";
  }
  return timestamp && signature ? { timestamp, signature } : null;
}

/**
 * HMAC-SHA256 of `<timestamp>.<body>`, hex, compared in constant time.
 *
 * `toleranceSec` bounds replay: a captured request stays valid forever without
 * it. Calendly's own guidance is 3 minutes.
 */
export function signatureMatches(
  body: string,
  header: string,
  secret: string,
  nowMs: number = Date.now(),
  toleranceSec: number = 180
): boolean {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;

  const sentAt = Number(parsed.timestamp);
  if (!Number.isFinite(sentAt)) return false;
  if (Math.abs(nowMs / 1000 - sentAt) > toleranceSec) return false;

  const expected = createHmac("sha256", secret)
    .update(`${parsed.timestamp}.${body}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(parsed.signature, "utf8");
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

/** The invitee uri is what we persist as `cal_event_id`. */
export function inviteeId(invitee: CalendlyInvitee): string | null {
  return invitee.uri ?? null;
}

/**
 * The invitee this booking replaces, or null for a fresh booking.
 *
 * Re-pointing the existing row's `cal_event_id` to the new invitee makes the
 * handler order-independent: whichever of the cancel/create pair lands second
 * finds either the already-moved row (and no-ops) or the old id (and moves it).
 */
export function rescheduledFrom(invitee: CalendlyInvitee): string | null {
  return invitee.rescheduled ? (invitee.old_invitee ?? null) : null;
}

export function inviteeEmail(invitee: CalendlyInvitee): string | null {
  return invitee.email?.toLowerCase() ?? null;
}

export interface BookableEnrollment {
  id: string;
  bookingUrl: string | null;
}

/**
 * Which enrollment does this booking belong to?
 *
 * Unlike Cal.com there is no usable slug: every session product shares one
 * Calendly event type, so the URL cannot discriminate. We rely on the
 * enrollment id round-tripping through `utm_content` (appended to the booking
 * link in `my-coaching-client.tsx`), and fall back to the sole bookable
 * enrollment when there's exactly one.
 *
 * `coaching_sessions.enrollment_id` is NOT NULL, so an unresolvable booking is
 * dropped rather than guessed — a missing row beats one filed against the wrong
 * purchase.
 */
export function matchEnrollment(
  candidates: BookableEnrollment[],
  utmContent: string | null | undefined
): BookableEnrollment | null {
  const bookable = candidates.filter((c) => c.bookingUrl);
  if (utmContent) {
    const tagged = bookable.find((c) => c.id === utmContent);
    // A tag that names an enrollment this profile doesn't hold is not a match.
    if (tagged) return tagged;
  }
  return bookable.length === 1 ? bookable[0] : null;
}
