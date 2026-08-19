"use client";

import { Button } from "@/components/ui/button";
import type { Catalog } from "@/lib/catalog";
import { startCheckout } from "@/lib/checkout";
import type { CatalogProductFields } from "@/types/db";

/**
 * The à la carte catalog for someone already signed in and already holding
 * things: a dense menu, not a pitch. Deliberately NOT `PricingCatalog` — that
 * one is marketing (py-24, a centred display headline, per-bundle contents
 * lists) and running it under "My Coaching" added several screens of scroll.
 *
 * Packages first because they're the better buy, then quick-adds. Products the
 * candidate already owns stay listed but aren't buyable — the row is how they
 * see the whole menu, and hiding it would make the list change shape per person.
 */

function price(cents: number | null): string {
  if (cents === null) return "—";
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function Row({
  product,
  owned,
  note,
}: {
  product: CatalogProductFields;
  owned: boolean;
  note?: string;
}) {
  return (
    <li className="flex items-center gap-4 border-border border-b px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[13.5px] text-foreground">
          {product.name}
        </p>
        {note && (
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{note}</p>
        )}
      </div>
      <span className="shrink-0 tabular-nums text-[13.5px] text-foreground">
        {price(product.price_cents)}
      </span>
      {owned ? (
        <span className="w-[76px] shrink-0 text-right text-[11px] text-muted-foreground uppercase tracking-[0.08em]">
          Owned
        </span>
      ) : (
        <Button
          className="w-[76px] shrink-0"
          onClick={() => void startCheckout(product)}
          size="sm"
          variant="outline"
        >
          Buy
        </Button>
      )}
    </li>
  );
}

export function CoachingMenu({
  catalog,
  ownedProductIds,
}: {
  catalog: Catalog;
  /** Product ids this candidate holds an enrollment for. */
  ownedProductIds: Set<string>;
}) {
  const { bundles, sessions } = catalog;
  if (bundles.length === 0 && sessions.length === 0) return null;

  return (
    <section>
      <h2 className="font-medium text-[13px] text-foreground">
        Add more coaching
      </h2>
      <p className="mt-1 text-[12.5px] text-muted-foreground">
        À la carte — one-time, no subscription.
      </p>

      <div className="mt-3 border border-border bg-card">
        {bundles.length > 0 && (
          <ul>
            {bundles.map((b) => (
              <Row
                key={b.id}
                note={
                  b.contents.length > 0
                    ? `Includes ${b.contents.join(", ")}`
                    : undefined
                }
                owned={ownedProductIds.has(b.id)}
                product={b}
              />
            ))}
          </ul>
        )}
        {sessions.length > 0 && (
          <ul className={bundles.length > 0 ? "border-border border-t-2" : ""}>
            {sessions.map((s) => (
              <Row key={s.id} owned={ownedProductIds.has(s.id)} product={s} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
