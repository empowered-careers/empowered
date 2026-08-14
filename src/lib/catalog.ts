import { createClient } from "@/lib/supabase/server";
import {
  CATALOG_COACH_COLUMNS,
  CATALOG_PRODUCT_COLUMNS,
  type CatalogCoachFields,
  type CatalogProductFields,
} from "@/types/db";

/**
 * The à la carte catalog, read for `/pricing` and the homepage pricing block.
 * Anonymous-readable — the `coaching_products: read active` policy covers `anon`,
 * so this works before login and needs no service client.
 *
 * `kind = 'service'` and `'course'` rows are deliberately not returned: nothing
 * sells them yet. Add a group here when they do.
 */
export interface CatalogBundle extends CatalogProductFields {
  /** Names of the quick-add SKUs this bundle grants, cheapest first. */
  contents: string[];
}

export interface Catalog {
  /** kind='bundle', cheapest first — index order drives the Silver/Gold/Platinum label. */
  bundles: CatalogBundle[];
  /** kind='session', cheapest first. */
  sessions: CatalogProductFields[];
  /** Keyed by coach id, for the coach card on session products. */
  coaches: Record<string, CatalogCoachFields>;
}

const EMPTY: Catalog = { bundles: [], sessions: [], coaches: {} };

export async function fetchCatalog(): Promise<Catalog> {
  const supabase = await createClient();

  const [{ data: products }, { data: contents }, { data: coaches }] =
    await Promise.all([
      supabase
        .from("coaching_products")
        .select(CATALOG_PRODUCT_COLUMNS)
        .eq("is_active", true)
        .in("kind", ["bundle", "session"])
        .order("price_cents", { ascending: true }),
      supabase.from("bundle_contents").select("bundle_id, product_id"),
      supabase.from("coaches").select(CATALOG_COACH_COLUMNS).eq("active", true),
    ]);

  if (!products) return EMPTY;

  // ponytail: group in JS rather than a nested select. 11 products, 16 join rows —
  // move it to a view if the catalog ever reaches hundreds. Walking `products`
  // (already price-ordered) rather than the join rows keeps contents ordered too,
  // and drops any contained product that is inactive or a kind we don't return.
  const pairs = new Set(
    (contents ?? []).map((r) => `${r.bundle_id}|${r.product_id}`)
  );

  return {
    bundles: products
      .filter((p) => p.kind === "bundle")
      .map((bundle) => ({
        ...bundle,
        contents: products
          .filter((p) => pairs.has(`${bundle.id}|${p.id}`))
          .map((p) => p.name),
      })),
    sessions: products.filter((p) => p.kind === "session"),
    coaches: Object.fromEntries((coaches ?? []).map((c) => [c.id, c])),
  };
}
