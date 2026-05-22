/**
 * Minimal Loops REST wrapper for lifecycle events.
 *
 * Loops API docs: https://loops.so/docs/api
 *
 * Design notes:
 *  - No npm dep; raw fetch keeps the bundle clean and lets us stub easily.
 *  - Every call is fire-and-forget from the caller's POV: a network failure
 *    must never block a registration / signup flow. Errors are logged and
 *    swallowed.
 *  - When LOOPS_API_KEY is unset (dev, preview), the functions short-circuit
 *    to no-ops with a debug log. This lets local devs run the events flow
 *    end-to-end without provisioning Loops.
 */

import { env } from "../../../env";

const LOOPS_ENDPOINT = "https://app.loops.so/api/v1";

type LoopsEventProps = Record<
  string,
  string | number | boolean | null | undefined
>;

interface SendEventInput {
  email: string;
  eventName: string;
  /** Loops contact properties — flat key/value bag, merged into the contact. */
  contactProperties?: LoopsEventProps;
  /** Event-only properties — visible in the event payload, not on the contact. */
  eventProperties?: LoopsEventProps;
}

async function callLoops(path: string, body: unknown): Promise<void> {
  if (!env.LOOPS_API_KEY) {
    if (env.NODE_ENV !== "production") {
      console.info("[loops] no LOOPS_API_KEY set, skipping", path, body);
    }
    return;
  }
  try {
    const res = await fetch(`${LOOPS_ENDPOINT}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.LOOPS_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[loops] non-2xx", path, res.status, text);
    }
  } catch (err) {
    console.error("[loops] fetch failed", path, err);
  }
}

/**
 * Fire a lifecycle event on a contact. Loops creates the contact on first
 * sight, so a `lead.registered` event also serves as the initial contact
 * upsert.
 */
export async function sendLoopsEvent(input: SendEventInput): Promise<void> {
  await callLoops("/events/send", {
    email: input.email,
    eventName: input.eventName,
    contactProperties: input.contactProperties ?? {},
    eventProperties: input.eventProperties ?? {},
  });
}

/** Convenience wrappers — one per lifecycle stage the events plan defines. */

export interface LeadRegisteredProps {
  email: string;
  firstName?: string | null;
  eventSlug: string;
  eventTitle: string;
  eventDate: string;
  source: string;
  sourceRef?: string | null;
}

export async function fireLeadRegistered(
  p: LeadRegisteredProps
): Promise<void> {
  await sendLoopsEvent({
    email: p.email,
    eventName: "lead.registered",
    contactProperties: {
      firstName: p.firstName ?? undefined,
      acquisitionSource: p.source,
      acquisitionRef: p.sourceRef ?? undefined,
      // Mirror event identity onto the contact so email templates can use
      // {{latestEventTitle}} merge tags and audience filters can segment by
      // event. eventProperties below are per-fire only.
      latestEventSlug: p.eventSlug,
      latestEventTitle: p.eventTitle,
      latestEventDate: p.eventDate,
    },
    eventProperties: {
      eventSlug: p.eventSlug,
      eventTitle: p.eventTitle,
      eventDate: p.eventDate,
      source: p.source,
      sourceRef: p.sourceRef ?? undefined,
    },
  });
}

export interface LeadAttendedProps {
  email: string;
  eventSlug: string;
  eventTitle: string;
  attendedAt: string;
}

export async function fireLeadAttended(p: LeadAttendedProps): Promise<void> {
  await sendLoopsEvent({
    email: p.email,
    eventName: "lead.attended",
    contactProperties: {
      latestEventSlug: p.eventSlug,
      latestEventTitle: p.eventTitle,
      latestEventAttendedAt: p.attendedAt,
    },
    eventProperties: {
      eventSlug: p.eventSlug,
      eventTitle: p.eventTitle,
      attendedAt: p.attendedAt,
    },
  });
}

export interface LeadConvertedProps {
  email: string;
  profileId: string;
  eventSlug?: string | null;
  eventTitle?: string | null;
  source: string;
  sourceRef?: string | null;
}

export async function fireLeadConverted(p: LeadConvertedProps): Promise<void> {
  await sendLoopsEvent({
    email: p.email,
    eventName: "lead.converted",
    contactProperties: {
      acquisitionSource: p.source,
      acquisitionRef: p.sourceRef ?? undefined,
      // Stamp the event the conversion came from so the welcome template can
      // open with "Welcome — saw you at {{convertedFromEventTitle}}".
      convertedFromEventSlug: p.eventSlug ?? undefined,
      convertedFromEventTitle: p.eventTitle ?? undefined,
    },
    eventProperties: {
      profileId: p.profileId,
      eventSlug: p.eventSlug ?? undefined,
      eventTitle: p.eventTitle ?? undefined,
      source: p.source,
    },
  });
}
