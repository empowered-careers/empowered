import Link from "next/link";
import { notFound } from "next/navigation";

import { CoachingProductForm } from "@/components/admin/coaching-product-form";
import { createClient } from "@/lib/supabase/server";
import type { CoachingProductRow } from "@/types/db";

export const metadata = {
  title: "Admin · Edit product",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCoachingEditPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("coaching_products")
    .select("*")
    .eq("id", id)
    .single<CoachingProductRow>();

  if (!product) notFound();

  return (
    <div className="space-y-8 px-10 py-8">
      <section>
        <Link
          className="text-muted-foreground text-xs hover:text-foreground"
          href="/admin/coaching"
        >
          ← All products
        </Link>
        <h1 className="mt-2 font-display font-medium text-2xl tracking-tight">
          {product.name}
        </h1>
      </section>

      <section>
        <div className="border border-border bg-card p-5">
          <CoachingProductForm product={product} />
        </div>
      </section>
    </div>
  );
}
