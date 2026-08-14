import { PricingCatalog } from "@/components/catalog/pricing-catalog";
import { fetchCatalog } from "@/lib/catalog";

/**
 * Homepage pricing section — the `#pricing` anchor that Navbar and Footer point
 * at. Same component as `/pricing` in link mode: CTAs route to /pricing, where
 * Checkout actually happens.
 */
export async function HomePricing() {
  const catalog = await fetchCatalog();
  return <PricingCatalog catalog={catalog} />;
}
