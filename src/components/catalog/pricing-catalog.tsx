"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Catalog } from "@/lib/catalog";
import { startCheckout } from "@/lib/checkout";
import { cn } from "@/lib/utils";
import type { CatalogProductFields } from "@/types/db";

/**
 * The à la carte catalog: bundles as tier cards, quick-add sessions as a table.
 * One component for both `/pricing` (checkout-wired) and the homepage block
 * (`checkout={false}` → CTAs link to /pricing instead of starting Checkout).
 *
 * No subscription cadence toggle and no plan anywhere — every row is a one-time
 * purchase resolved through `enrollments`.
 */

// Tier labels live here, not in the DB — there is no column for them and only
// the bundle's position (cheapest → dearest) determines which one applies.
const TIER_LABELS = ["Silver", "Gold", "Platinum"];
/** The middle bundle is the one Lauren expects most people to take. */
const FEATURED_INDEX = 1;

function price(cents: number | null): string {
  if (cents === null) return "—";
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

interface Props {
  catalog: Catalog;
  /** True on /pricing: clicking a CTA starts Stripe Checkout. */
  checkout?: boolean;
  isAuthed?: boolean;
}

export function PricingCatalog({
  catalog,
  checkout = false,
  isAuthed = false,
}: Props) {
  const { bundles, sessions, coaches } = catalog;

  async function buy(product: CatalogProductFields) {
    // Checked before the redirects below so an unpriced product says so on the
    // homepage too, rather than bouncing the visitor to /pricing.
    if (!product.stripe_price_id) {
      toast.error("This one isn't open for purchase yet.");
      return;
    }
    if (!checkout) {
      window.location.assign("/pricing");
      return;
    }
    if (!isAuthed) {
      window.location.assign("/login?next=/pricing");
      return;
    }
    await startCheckout(product);
  }

  if (bundles.length === 0 && sessions.length === 0) {
    return (
      <section className="bg-background py-24" id="pricing">
        <div className="container mx-auto px-4 text-center">
          <p className="font-sans text-sm text-foreground/50">
            The coaching catalog is being finalized — check back shortly.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background py-24 md:py-32" id="pricing">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <p className="mb-4 font-sans font-semibold text-[11px] text-foreground/40 uppercase tracking-[0.28em]">
            Choose your level
          </p>
          <h2 className="font-display font-bold text-4xl text-foreground md:text-5xl">
            Coaching, à la carte
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-sans text-base text-foreground/60">
            Start with a single session or take a full arc. No subscription —
            you pay once for what you actually want.
          </p>
        </div>

        {bundles.length > 0 && (
          <div className="grid gap-6 md:grid-cols-3">
            {bundles.map((bundle, i) => {
              const featured = i === FEATURED_INDEX;
              return (
                <div
                  className={cn(
                    "flex flex-col border border-border bg-card p-8",
                    featured && "border-accent"
                  )}
                  key={bundle.id}
                >
                  {TIER_LABELS[i] && (
                    <p className="mb-2 font-sans font-bold text-[11px] text-foreground/40 uppercase tracking-[0.22em]">
                      {TIER_LABELS[i]}
                    </p>
                  )}
                  <h3 className="font-display font-bold text-2xl text-foreground uppercase">
                    {bundle.name}
                  </h3>
                  {bundle.description && (
                    <p className="mt-3 font-sans text-sm text-foreground/60">
                      {bundle.description}
                    </p>
                  )}
                  <p className="mt-6 font-display font-bold text-4xl text-foreground">
                    {price(bundle.price_cents)}
                  </p>

                  {bundle.contents.length > 0 && (
                    <ul className="mt-6 flex-1 border-t border-border">
                      {bundle.contents.map((name) => (
                        <li
                          className="border-b border-border py-2.5 font-sans text-sm text-foreground/70"
                          key={name}
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                  )}

                  <Button
                    className="mt-8 w-full"
                    onClick={() => buy(bundle)}
                    variant={featured ? "lime" : "outline"}
                  >
                    {checkout ? `Get ${bundle.name}` : "See what's included"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {sessions.length > 0 && (
          <div className="mt-24">
            <p className="mb-3 font-sans font-semibold text-[11px] text-foreground/40 uppercase tracking-[0.28em]">
              Prefer to build your own?
            </p>
            <h3 className="font-display font-bold text-2xl text-foreground md:text-3xl">
              Single sessions
            </h3>

            <div className="mt-8 overflow-x-auto border border-border">
              <table className="w-full min-w-[560px] text-left">
                <tbody>
                  {sessions.map((s) => {
                    const coach = s.coach_id ? coaches[s.coach_id] : undefined;
                    return (
                      <tr
                        className="border-border border-b last:border-b-0"
                        key={s.id}
                      >
                        <td className="p-5 align-top">
                          <p className="font-sans font-bold text-foreground text-sm">
                            {s.name}
                          </p>
                          {s.description && (
                            <p className="mt-1 max-w-sm font-sans text-foreground/55 text-sm">
                              {s.description}
                            </p>
                          )}
                          {coach && (
                            <p className="mt-2 font-sans text-[12px] text-foreground/40">
                              With {coach.name}
                            </p>
                          )}
                        </td>
                        <td className="p-5 text-right align-top font-display font-bold text-foreground">
                          {price(s.price_cents)}
                        </td>
                        <td className="p-5 text-right align-top">
                          <Button
                            onClick={() => buy(s)}
                            size="sm"
                            variant="outline"
                          >
                            {checkout ? "Book" : "View"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
