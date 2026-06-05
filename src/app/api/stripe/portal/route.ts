import { NextResponse } from "next/server";

import { siteUrl } from "@/config/site";
import { requireUser } from "@/lib/auth/require-role";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";

/**
 * Creates a Stripe Customer Portal session and returns its URL (the client
 * redirects). Used by the "Manage subscription" link on /billing.
 */
export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured yet." },
      { status: 503 }
    );
  }

  const { userId } = await requireUser();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account yet." },
      { status: 400 }
    );
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${siteUrl}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
