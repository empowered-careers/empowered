import type { BillingCadence, Plan } from "@/types/db";

import { env } from "../../../env";
import { getStripe, isStripeConfigured } from "./client";

export interface PlanForPrice {
  plan: Plan;
  billingCadence: BillingCadence;
}

/**
 * The 4 fixed subscription prices (Core = plan_2, Pro = plan_3; monthly /
 * quarterly), sourced from env. À la carte prices live on
 * `coaching_products.stripe_price_id` and are validated separately.
 */
const SUBSCRIPTION_PRICES: ReadonlyArray<{
  priceId: string | undefined;
  plan: Plan;
  billingCadence: BillingCadence;
}> = [
  {
    priceId: env.STRIPE_PRICE_CORE_MONTHLY,
    plan: "plan_2",
    billingCadence: "monthly",
  },
  {
    priceId: env.STRIPE_PRICE_CORE_QUARTERLY,
    plan: "plan_2",
    billingCadence: "quarterly",
  },
  {
    priceId: env.STRIPE_PRICE_PRO_MONTHLY,
    plan: "plan_3",
    billingCadence: "monthly",
  },
  {
    priceId: env.STRIPE_PRICE_PRO_QUARTERLY,
    plan: "plan_3",
    billingCadence: "quarterly",
  },
];

/** Map a subscription price ID → { plan, billingCadence }, or null if unknown. */
export function priceIdToPlan(priceId: string): PlanForPrice | null {
  const match = SUBSCRIPTION_PRICES.find(
    (p) => p.priceId && p.priceId === priceId
  );
  return match
    ? { plan: match.plan, billingCadence: match.billingCadence }
    : null;
}

/** The configured subscription price IDs (env vars that are actually set). */
export function subscriptionPriceIds(): string[] {
  return SUBSCRIPTION_PRICES.map((p) => p.priceId).filter((id): id is string =>
    Boolean(id)
  );
}

/**
 * Live, currency-formatted display amounts for all configured subscription
 * prices, keyed by price ID. Empty when Stripe isn't configured. The Stripe
 * Dashboard is the source of truth for amounts (decision #4).
 */
export async function fetchPriceAmounts(): Promise<Record<string, string>> {
  const ids = subscriptionPriceIds();
  const out: Record<string, string> = {};
  if (!isStripeConfigured() || ids.length === 0) return out;
  const stripe = getStripe();
  await Promise.all(
    ids.map(async (id) => {
      try {
        const price = await stripe.prices.retrieve(id);
        if (price.unit_amount != null) {
          out[id] = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: (price.currency ?? "usd").toUpperCase(),
            maximumFractionDigits: 0,
          }).format(price.unit_amount / 100);
        }
      } catch {
        // Missing/unreadable price — skip; the card shows "—".
      }
    })
  );
  return out;
}
