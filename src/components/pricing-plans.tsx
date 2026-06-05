"use client";

import { toast } from "sonner";

import { type Pricing3PlansPlan, Pricing4 } from "@/components/pricing";

/**
 * Checkout-wired pricing for `/pricing`. Renders the `Pricing4` block and turns
 * a plan selection into a Stripe Checkout redirect for the chosen cadence.
 * Free (no price) → signup; unauthenticated → /login first.
 */
export function PricingPlans({
  plans,
  isAuthed,
}: {
  plans: Pricing3PlansPlan[];
  isAuthed: boolean;
}) {
  async function handleSelect(plan: Pricing3PlansPlan, isSecondary: boolean) {
    const priceId = isSecondary ? plan.yearlyPriceId : plan.monthlyPriceId;
    if (!priceId) {
      window.location.assign(plan.buttonUrl ?? "/login?tab=signup");
      return;
    }
    if (!isAuthed) {
      window.location.assign("/login?next=/pricing");
      return;
    }
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Could not start checkout.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      toast.error("Could not start checkout.");
    }
  }

  return (
    <Pricing4
      heading="Membership"
      description="The exclusive job board is members-only. Core unlocks curated roles; Pro adds the closed-network exclusive roles."
      plans={plans}
      secondaryLabel="Quarterly"
      onSelect={handleSelect}
    />
  );
}
