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

export interface CandidatePaymentProps {
  email: string;
  profileId: string;
  amountCents: number;
  productType: string;
  billingReason: string;
}

/** Fires on every successful charge (subscription create/cycle + one-time). */
export async function fireCandidatePayment(
  p: CandidatePaymentProps
): Promise<void> {
  await sendLoopsEvent({
    email: p.email,
    eventName: "candidate.payment",
    eventProperties: {
      profileId: p.profileId,
      amountCents: p.amountCents,
      productType: p.productType,
      billingReason: p.billingReason,
    },
  });
}

export interface CandidatePlanUpgradedProps {
  email: string;
  profileId: string;
  plan: string;
  billingCadence?: string | null;
}

/** Fires when a subscription event raises the candidate's plan. */
export async function fireCandidatePlanUpgraded(
  p: CandidatePlanUpgradedProps
): Promise<void> {
  await sendLoopsEvent({
    email: p.email,
    eventName: "candidate.plan_upgraded",
    contactProperties: {
      plan: p.plan,
      billingCadence: p.billingCadence ?? undefined,
    },
    eventProperties: {
      profileId: p.profileId,
      plan: p.plan,
      billingCadence: p.billingCadence ?? undefined,
    },
  });
}

export interface AssessmentStartedProps {
  email: string;
  firstName?: string | null;
  source: string;
  sourceRef?: string | null;
}

/** Fires when a quiz-taker submits their email at the mid-quiz gate. */
export async function fireAssessmentStarted(
  p: AssessmentStartedProps
): Promise<void> {
  await sendLoopsEvent({
    email: p.email,
    eventName: "assessment.started",
    contactProperties: {
      firstName: p.firstName ?? undefined,
      acquisitionSource: p.source,
      acquisitionRef: p.sourceRef ?? undefined,
    },
    eventProperties: {
      source: p.source,
      sourceRef: p.sourceRef ?? undefined,
    },
  });
}

export interface AssessmentCompletedProps {
  email: string;
  tier: string;
  overallPct: number;
  weakestArea: string;
}

/** Fires when a quiz-taker reaches the results screen — drives nurture. */
export async function fireAssessmentCompleted(
  p: AssessmentCompletedProps
): Promise<void> {
  await sendLoopsEvent({
    email: p.email,
    eventName: "assessment.completed",
    contactProperties: {
      assessmentTier: p.tier,
      assessmentScore: p.overallPct,
      assessmentWeakestArea: p.weakestArea,
    },
    eventProperties: {
      tier: p.tier,
      overallPct: p.overallPct,
      weakestArea: p.weakestArea,
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

// ── Coaching/content pivot events (brief §6) ─────────────────
// The job-board-dependent wrappers above stay in place but are no longer called
// from anywhere live — dormant, not deleted, same as the board itself.

export interface CandidateSignupProps {
  email: string;
  firstName?: string | null;
  source?: string | null;
}

/** Fires once, at OAuth callback, the first time a profile row appears. */
export async function fireCandidateSignup(
  p: CandidateSignupProps
): Promise<void> {
  await sendLoopsEvent({
    email: p.email,
    eventName: "candidate.signup",
    contactProperties: {
      firstName: p.firstName ?? undefined,
      acquisitionSource: p.source ?? undefined,
    },
  });
}

export interface ResumeUploadedProps {
  email: string;
  resumeScore?: number | null;
}

/** Fires when the resume parse completes — the intake spine's key milestone. */
export async function fireResumeUploaded(
  p: ResumeUploadedProps
): Promise<void> {
  await sendLoopsEvent({
    email: p.email,
    eventName: "candidate.resume_uploaded",
    contactProperties: { resumeScore: p.resumeScore ?? undefined },
    eventProperties: { resumeScore: p.resumeScore ?? undefined },
  });
}

export interface CoursePurchasedProps {
  email: string;
  productName: string;
  productKind: string;
  amountCents: number;
}

/** Fires on any à la carte purchase — course, session, service or bundle. */
export async function fireCoursePurchased(
  p: CoursePurchasedProps
): Promise<void> {
  await sendLoopsEvent({
    email: p.email,
    eventName: "candidate.course_purchased",
    contactProperties: { lastPurchase: p.productName },
    eventProperties: {
      productName: p.productName,
      productKind: p.productKind,
      amountCents: p.amountCents,
    },
  });
}

export interface SessionBookedProps {
  email: string;
  productName: string;
  scheduledFor: string;
}

/** Fires from the Cal.com webhook once a booking is attached to an enrollment. */
export async function fireSessionBooked(p: SessionBookedProps): Promise<void> {
  await sendLoopsEvent({
    email: p.email,
    eventName: "candidate.session_booked",
    eventProperties: {
      productName: p.productName,
      scheduledFor: p.scheduledFor,
    },
  });
}

export interface EnrollmentCompletedProps {
  email: string;
  productName: string;
}

/**
 * Fires when a course hits 100%. This is the single highest-value trigger in the
 * new model: course finished → book the related coach (brief §6).
 */
export async function fireEnrollmentCompleted(
  p: EnrollmentCompletedProps
): Promise<void> {
  await sendLoopsEvent({
    email: p.email,
    eventName: "candidate.enrollment_completed",
    contactProperties: { lastCompletedCourse: p.productName },
    eventProperties: { productName: p.productName },
  });
}

export interface CandidateInactiveProps {
  email: string;
  firstName?: string | null;
  days: 7 | 30;
}

/** Fires from the daily `sweep-inactive` cron. */
export async function fireCandidateInactive(
  p: CandidateInactiveProps
): Promise<void> {
  await sendLoopsEvent({
    email: p.email,
    eventName:
      p.days === 7 ? "candidate.inactive_7d" : "candidate.inactive_30d",
    contactProperties: { firstName: p.firstName ?? undefined },
    eventProperties: { days: p.days },
  });
}
