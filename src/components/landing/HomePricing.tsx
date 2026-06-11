import { Pricing4 } from "@/components/pricing";
import { buildPricingPlans } from "@/config/pricing";
import { fetchPriceAmounts } from "@/lib/stripe/prices";

/**
 * Homepage pricing section. Server component — fetches live amounts and renders
 * the shared `Pricing4` block in link mode (CTAs route to /pricing or signup;
 * actual Checkout happens on /pricing).
 */
export async function HomePricing() {
  const amounts = await fetchPriceAmounts();
  const plans = buildPricingPlans(amounts);

  return (
    <div id="pricing">
      <Pricing4
        heading="Simple, transparent access"
        description="Start free with our assessment tools, or unlock the full private network. Cancel anytime."
        plans={plans}
        secondaryLabel="Quarterly"
      />
    </div>
  );
}
