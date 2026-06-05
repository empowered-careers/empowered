import type { BillingCadence, Plan } from "@/types/db";

import { env } from "../../../env";

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
