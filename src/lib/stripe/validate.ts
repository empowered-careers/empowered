import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

import { subscriptionPriceIds } from "./prices";

export type CheckoutKind = "subscription" | "one_time";

/**
 * Reject any price ID that isn't either a configured subscription price or an
 * active `coaching_products.stripe_price_id`. Prevents a client from passing an
 * arbitrary Stripe price into Checkout. Returns the checkout `kind` so the
 * route can pick the Checkout `mode` and stamp metadata.
 */
export async function assertAllowedPriceId(
  supabase: SupabaseClient<Database>,
  priceId: string
): Promise<CheckoutKind> {
  if (subscriptionPriceIds().includes(priceId)) {
    return "subscription";
  }

  const { data } = await supabase
    .from("coaching_products")
    .select("stripe_price_id")
    .eq("stripe_price_id", priceId)
    .eq("is_active", true)
    .maybeSingle();

  if (data?.stripe_price_id) {
    return "one_time";
  }

  throw new Error(`Price ${priceId} is not an allowed checkout price`);
}
