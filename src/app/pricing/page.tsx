import type { Metadata } from "next";

import { PlanCard } from "@/components/pricing/plan-card";
import { PRICING_TIERS } from "@/config/pricing";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Subscribe to Core or Pro to unlock the private job board — curated and exclusive roles you won't find on public boards.",
};

/** Live display amounts from Stripe (the catalog source of truth). */
async function fetchPriceAmounts(
  priceIds: string[]
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!isStripeConfigured() || priceIds.length === 0) return out;
  const stripe = getStripe();
  await Promise.all(
    priceIds.map(async (id) => {
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
        // Missing/unreadable price — leave it out; the card shows "unavailable".
      }
    })
  );
  return out;
}

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = Boolean(user);

  const priceIds = PRICING_TIERS.flatMap((t) =>
    t.options.map((o) => o.priceId)
  ).filter((id): id is string => Boolean(id));
  const amounts = await fetchPriceAmounts(priceIds);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="text-center">
        <h1 className="font-display text-3xl font-medium text-foreground">
          Membership
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[14px] text-muted-foreground">
          The exclusive job board is members-only. Core unlocks curated roles;
          Pro adds the closed-network exclusive roles.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {PRICING_TIERS.map((tier) => (
          <PlanCard
            key={tier.key}
            id={tier.key}
            name={tier.name}
            blurb={tier.blurb}
            features={tier.features}
            highlighted={tier.highlighted}
            isAuthed={isAuthed}
            isFree={tier.key === "free"}
            options={tier.options.map((o) => ({
              label: o.label,
              priceId: o.priceId,
              amount: o.priceId ? (amounts[o.priceId] ?? null) : null,
            }))}
          />
        ))}
      </div>

      {!isStripeConfigured() && (
        <p className="mt-8 text-center text-[12.5px] text-muted-foreground">
          Pricing is being finalized — subscriptions open soon.
        </p>
      )}
    </main>
  );
}
