import type { Metadata } from "next";

import { PricingCatalog } from "@/components/catalog/pricing-catalog";
import { fetchCatalog } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Executive-grade career coaching, à la carte. Start with a single session or take a full arc — no subscription.",
};

export default async function PricingPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    catalog,
  ] = await Promise.all([supabase.auth.getUser(), fetchCatalog()]);

  return (
    <main>
      <PricingCatalog catalog={catalog} checkout isAuthed={Boolean(user)} />
    </main>
  );
}
