import {
  type CalendlyWebhookBody,
  durationMinutes,
  inviteeEmail,
  inviteeId,
  matchEnrollment,
  rescheduledFrom,
  signatureMatches,
  statusForEvent,
} from "@/lib/calendly";
import { fireSessionBooked } from "@/lib/loops/client";
import { createNotification } from "@/lib/notifications/create";
import { createServiceClient } from "@/lib/supabase/service";

import { env } from "../../../../../env";

// HMAC verification needs the raw body + Node runtime.
export const runtime = "nodejs";

/**
 * Calendly booking webhook → `coaching_sessions`.
 *
 * The Cal.com sibling (`/api/cal/webhook`) is the reference; this exists because
 * Lauren's bench books through Calendly. Subscribe this endpoint to
 * `invitee.created` and `invitee.canceled` — those two carry reschedules as well.
 *
 * Anything we can't act on is a 200: Calendly retries on non-2xx, and a payload
 * we structurally can't match will never succeed on a retry. Only a genuine
 * write failure returns 500.
 *
 * Pure helpers + their tests: `src/lib/calendly.ts`, `src/lib/calendly.check.ts`.
 */
export async function POST(request: Request) {
  if (!env.CALENDLY_WEBHOOK_SECRET) {
    return new Response("Calendly webhook not configured", { status: 503 });
  }

  const signature = request.headers.get("calendly-webhook-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await request.text();
  if (!signatureMatches(body, signature, env.CALENDLY_WEBHOOK_SECRET)) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: CalendlyWebhookBody;
  try {
    event = JSON.parse(body) as CalendlyWebhookBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const status = statusForEvent(event.event);
  if (!status) return new Response("ignored", { status: 200 });

  const invitee = event.payload ?? {};
  const eventId = inviteeId(invitee);
  const startTime = invitee.scheduled_event?.start_time;
  const email = inviteeEmail(invitee);
  if (!eventId || !startTime || !email) {
    return new Response("ignored", { status: 200 });
  }

  const supabase = createServiceClient();
  const previousId = rescheduledFrom(invitee);

  // A cancellation only needs the row Calendly already told us about. The
  // cancel half of a reschedule is skipped: its `invitee.created` twin carries
  // the new time, and marking the row canceled in between would either race it
  // or leave a spurious cancellation in the candidate's history.
  if (status === "canceled") {
    if (previousId) return new Response("ignored", { status: 200 });
    await supabase
      .from("coaching_sessions")
      .update({ status: "canceled" })
      .eq("cal_event_id", eventId);
    return new Response("ok", { status: 200 });
  }

  const scheduledFor = new Date(startTime).toISOString();
  const duration = durationMinutes(
    startTime,
    invitee.scheduled_event?.end_time
  );

  // A reschedule arrives as a brand-new invitee, so move the existing row onto
  // the new id instead of inserting a second one.
  if (previousId) {
    const { data: prior } = await supabase
      .from("coaching_sessions")
      .select("id")
      .eq("cal_event_id", previousId)
      .maybeSingle();

    if (prior) {
      const { error } = await supabase
        .from("coaching_sessions")
        .update({
          cal_event_id: eventId,
          scheduled_for: scheduledFor,
          duration_min: duration,
          status: "scheduled",
        })
        .eq("id", prior.id);
      if (error) return new Response("handler error", { status: 500 });
      return new Response("ok", { status: 200 });
    }
    // No prior row (the original booking predates this endpoint, or was never
    // matched) — fall through and treat it as a first booking.
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (!profile) return new Response("ignored", { status: 200 });

  const { data: rows } = await supabase
    .from("enrollments")
    .select("id, product:coaching_products(booking_url)")
    .eq("profile_id", profile.id)
    .in("status", ["active", "completed"]);

  const matched = matchEnrollment(
    (rows ?? []).map((row) => {
      const product = Array.isArray(row.product) ? row.product[0] : row.product;
      return { id: row.id, bookingUrl: product?.booking_url ?? null };
    }),
    invitee.tracking?.utm_content
  );
  if (!matched) return new Response("ignored", { status: 200 });

  // Calendly redelivers on our 5xx and on manual replay, so an existing row for
  // this invitee is an update, not a duplicate.
  const { data: existing } = await supabase
    .from("coaching_sessions")
    .select("id")
    .eq("cal_event_id", eventId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("coaching_sessions")
      .update({
        scheduled_for: scheduledFor,
        duration_min: duration,
        status: "scheduled",
      })
      .eq("id", existing.id);
    if (error) return new Response("handler error", { status: 500 });
    return new Response("ok", { status: 200 });
  }

  const { error } = await supabase.from("coaching_sessions").insert({
    enrollment_id: matched.id,
    profile_id: profile.id,
    scheduled_for: scheduledFor,
    duration_min: duration,
    cal_event_id: eventId,
    status: "scheduled",
  });
  if (error) return new Response("handler error", { status: 500 });

  await fireBookedEvent(supabase, matched.id, scheduledFor);

  await createNotification(
    {
      profileId: profile.id,
      type: "session_booked",
      title: "Session booked",
      body: `You're confirmed for ${new Date(scheduledFor).toLocaleString()}.`,
      href: "/content",
    },
    supabase
  );

  return new Response("ok", { status: 200 });
}

/**
 * Loops `candidate.session_booked`. Split out so the handler above reads as the
 * write path; a Loops failure is already swallowed inside the wrapper.
 */
async function fireBookedEvent(
  supabase: ReturnType<typeof createServiceClient>,
  enrollmentId: string,
  scheduledFor: string
): Promise<void> {
  const { data } = await supabase
    .from("enrollments")
    .select("profile:profiles(email), product:coaching_products(name)")
    .eq("id", enrollmentId)
    .maybeSingle();
  const p = Array.isArray(data?.profile) ? data.profile[0] : data?.profile;
  const product = Array.isArray(data?.product)
    ? data.product[0]
    : data?.product;
  if (!p?.email) return;
  await fireSessionBooked({
    email: p.email,
    productName: product?.name ?? "Coaching session",
    scheduledFor,
  });
}
