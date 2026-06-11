import type { Metadata } from "next";

import { PricingPlans } from "@/components/pricing-plans";
import { buildPricingPlans } from "@/config/pricing";
import { isStripeConfigured } from "@/lib/stripe/client";
import { fetchPriceAmounts } from "@/lib/stripe/prices";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Subscribe to Core or Pro to unlock the private job board — curated and exclusive roles you won't find on public boards.",
};

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const amounts = await fetchPriceAmounts();
  const plans = buildPricingPlans(amounts);

  return (
    <main>
      <PricingPlans plans={plans} isAuthed={Boolean(user)} />
      {!isStripeConfigured() && (
        <p className="pb-16 text-center text-[12.5px] text-muted-foreground">
          Pricing is being finalized — subscriptions open soon.
        </p>
      )}
    </main>
  );
}
