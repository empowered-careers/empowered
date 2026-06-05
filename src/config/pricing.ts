import type { BillingCadence, Plan } from "@/types/db";

import { env } from "../../env";

/**
 * Pricing page catalog. The Stripe Dashboard owns prices; here we only describe
 * the marketed tiers + which env price ID backs each cadence. Dollar amounts
 * are fetched live from Stripe at render time (decision #4 in
 * `docs/done/ec-paywall-plan.md`) — we never hardcode amounts here.
 *
 * Coaching-session counts per tier are intentionally omitted: the bundled-
 * coaching entitlement (decision #7) is not yet specified.
 */
export interface PricingOption {
  cadence: BillingCadence;
  label: string;
  priceId: string | undefined;
}

export interface PricingTier {
  key: "free" | "core" | "pro";
  name: string;
  plan: Plan;
  blurb: string;
  features: string[];
  /** Subscription cadences. Empty for the free tier. */
  options: PricingOption[];
  highlighted?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    key: "free",
    name: "Free",
    plan: "free",
    blurb: "Get assessed and see what's out there.",
    features: [
      "Tier 1 (public/curated) roles",
      "Resume + LinkedIn upload",
      "Career Identity Blueprint assessment",
    ],
    options: [],
  },
  {
    key: "core",
    name: "Core",
    plan: "plan_2",
    blurb: "Unlock the curated job board and your full profile.",
    features: [
      "Everything in Free",
      "Tier 2 (semi-exclusive) roles",
      "All assessments",
      "Resume + LinkedIn scoring",
      "Coaching sessions included",
    ],
    options: [
      {
        cadence: "monthly",
        label: "Monthly",
        priceId: env.STRIPE_PRICE_CORE_MONTHLY,
      },
      {
        cadence: "quarterly",
        label: "Quarterly",
        priceId: env.STRIPE_PRICE_CORE_QUARTERLY,
      },
    ],
    highlighted: true,
  },
  {
    key: "pro",
    name: "Pro",
    plan: "plan_3",
    blurb: "The full network, including exclusive roles.",
    features: [
      "Everything in Core",
      "Tier 3 (exclusive) roles",
      "AI resume + LinkedIn improvement suggestions",
      "More coaching sessions included",
    ],
    options: [
      {
        cadence: "monthly",
        label: "Monthly",
        priceId: env.STRIPE_PRICE_PRO_MONTHLY,
      },
      {
        cadence: "quarterly",
        label: "Quarterly",
        priceId: env.STRIPE_PRICE_PRO_QUARTERLY,
      },
    ],
  },
];
