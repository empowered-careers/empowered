import {
  attendeeEmail,
  bookingSlug,
  type CalWebhookBody,
  durationMinutes,
  matchEnrollment,
  signatureMatches,
  statusForTrigger,
} from "@/lib/cal";
import { createNotification } from "@/lib/notifications/create";
import { createServiceClient } from "@/lib/supabase/service";

import { env } from "../../../../../env";

// HMAC verification needs the raw body + Node runtime.
export const runtime = "nodejs";

/**
 * Cal.com booking webhook → `coaching_sessions`.
 *
 * One shared Cal.com account with a booking link per event type (decision D2),
 * so the payload tells us the event type and the attendee and we resolve the
 * enrollment from those. Subscribe this endpoint to BOOKING_CREATED,
 * BOOKING_RESCHEDULED and BOOKING_CANCELLED.
 *
 * Anything we can't act on is a 200: Cal.com retries on non-2xx, and a payload
 * we structurally can't match will never succeed on a retry. Only a genuine
 * write failure returns 500.
 *
 * Pure helpers + their tests: `src/lib/cal.ts`, `src/lib/cal.check.ts`.
 */
export async function POST(request: Request) {
  if (!env.CAL_WEBHOOK_SECRET) {
    return new Response("Cal.com webhook not configured", { status: 503 });
  }

  const signature = request.headers.get("x-cal-signature-256");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await request.text();
  if (!signatureMatches(body, signature, env.CAL_WEBHOOK_SECRET)) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: CalWebhookBody;
  try {
    event = JSON.parse(body) as CalWebhookBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const status = statusForTrigger(event.triggerEvent);
  if (!status) return new Response("ignored", { status: 200 });

  const booking = event.payload ?? {};
  const calEventId = booking.uid;
  const email = attendeeEmail(booking);
  if (!calEventId || !booking.startTime || !email) {
    return new Response("ignored", { status: 200 });
  }

  const supabase = createServiceClient();

  // A cancellation only needs the row Cal.com already told us about.
  if (status === "canceled") {
    await supabase
      .from("coaching_sessions")
      .update({ status: "canceled" })
      .eq("cal_event_id", calEventId);
    return new Response("ok", { status: 200 });
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
    bookingSlug(booking)
  );
  if (!matched) return new Response("ignored", { status: 200 });

  const scheduledFor = new Date(booking.startTime).toISOString();
  const duration = durationMinutes(booking.startTime, booking.endTime);

  // Reschedules arrive with the same uid, so update rather than duplicate.
  const { data: existing } = await supabase
    .from("coaching_sessions")
    .select("id")
    .eq("cal_event_id", calEventId)
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
    cal_event_id: calEventId,
    status: "scheduled",
  });
  if (error) return new Response("handler error", { status: 500 });

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
