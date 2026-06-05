import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe/client";
import {
  handleCheckoutCompleted,
  handleInvoiceFailed,
  handleInvoicePaid,
  handleSubscriptionChange,
} from "@/lib/stripe/webhook-handlers";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database.types";

import { env } from "../../../../../env";

// Stripe signature verification needs the raw body + Node runtime.
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe webhook not configured", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createServiceClient();

  // Idempotency — Stripe redelivers. Ack immediately if already processed.
  const { data: existing } = await supabase
    .from("stripe_webhook_events")
    .select("processed_at")
    .eq("event_id", event.id)
    .maybeSingle();
  if (existing?.processed_at) {
    return new Response("ok", { status: 200 });
  }

  await supabase.from("stripe_webhook_events").upsert({
    event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Json,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(supabase, event.data.object as never);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChange(
          supabase,
          event.data.object as never,
          event.type
        );
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaid(supabase, event.data.object as never);
        break;
      case "invoice.payment_failed":
        await handleInvoiceFailed(supabase, event.data.object as never);
        break;
      default:
        // Unknown event — record + ack, don't 4xx (Stripe would retry forever).
        break;
    }

    await supabase
      .from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("event_id", event.id);

    return new Response("ok", { status: 200 });
  } catch (err) {
    await supabase
      .from("stripe_webhook_events")
      .update({ processing_error: String(err) })
      .eq("event_id", event.id);
    // 5xx so Stripe retries.
    return new Response("handler error", { status: 500 });
  }
}
