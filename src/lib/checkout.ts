import { toast } from "sonner";

import type { CatalogProductFields } from "@/types/db";

/**
 * Start Stripe Checkout for one à la carte product and redirect to it.
 *
 * Shared by `/pricing` (via PricingCatalog) and the in-app coaching menu, which
 * differ only in the pre-checks they run first — anonymous visitors get sent to
 * /login, so by the time either surface calls this the buyer is authenticated.
 */
export async function startCheckout(
  product: Pick<CatalogProductFields, "stripe_price_id">
): Promise<void> {
  // Not purchasable until Lauren attaches a Stripe price in /admin/coaching.
  if (!product.stripe_price_id) {
    toast.error("This one isn't open for purchase yet.");
    return;
  }
  try {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId: product.stripe_price_id }),
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
