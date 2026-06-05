import { NextResponse } from "next/server";

import { siteUrl } from "@/config/site";
import { requireUser } from "@/lib/auth/require-role";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { assertAllowedPriceId } from "@/lib/stripe/validate";
import { createClient } from "@/lib/supabase/server";

/**
 * Creates a Stripe Checkout Session for a subscription (Core/Pro) or a one-time
 * à la carte purchase, and returns its URL. The client redirects to it.
 *
 * Body: { priceId: string }. The kind (subscription vs one_time) is derived
 * server-side from the validated price — the client can't force it.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured yet." },
      { status: 503 }
    );
  }

  const { userId } = await requireUser();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const priceId = (body as { priceId?: unknown }).priceId;
  if (typeof priceId !== "string" || !priceId) {
    return NextResponse.json(
      { error: "priceId is required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  let kind: "subscription" | "one_time";
  try {
    kind = await assertAllowedPriceId(supabase, priceId);
  } catch {
    return NextResponse.json({ error: "Invalid price." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, stripe_customer_id")
    .eq("id", userId)
    .single();

  const stripe = getStripe();

  // Ensure a Stripe customer, persisting the id for the portal + webhook lookup.
  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? undefined,
      metadata: { profile_id: userId },
    });
    customerId = customer.id;
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: kind === "subscription" ? "subscription" : "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/checkout/success`,
    cancel_url: `${siteUrl}/checkout/cancel?price=${encodeURIComponent(priceId)}`,
    metadata: { profile_id: userId, kind, price_id: priceId },
  });

  return NextResponse.json({ url: session.url });
}
