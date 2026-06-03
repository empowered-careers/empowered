import Link from "next/link";

import { CoachingProductForm } from "@/components/admin/coaching-product-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin · Coaching",
  robots: { index: false, follow: false },
};

function formatCurrency(cents: number | null): string {
  if (cents === null) return "—";
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default async function AdminCoachingPage() {
  const supabase = await createClient();

  const [{ data: products }, { data: enrollments }] = await Promise.all([
    supabase
      .from("coaching_products")
      .select(
        "id, name, type, price_cents, is_active, external_url, description, created_at"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("enrollments")
      .select(
        "id, status, granted_at, progress, product:coaching_products(name), candidate:profiles!enrollments_profile_id_fkey(id, full_name, email)"
      )
      .order("granted_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-10 px-10 py-8">
      <section>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Coaching
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {products?.length ?? 0} products on the catalog ·{" "}
          {enrollments?.length ?? 0} recent enrollments
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">New product</h2>
        <div className="border border-border bg-card p-5">
          <CoachingProductForm />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">Catalog</h2>
        <div className="overflow-hidden border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 font-medium">Active</th>
                <th className="px-4 py-2 font-medium">External</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(products ?? []).map((p) => (
                <tr className="border-t border-border" key={p.id}>
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2 capitalize text-muted-foreground">
                    {p.type.replace("_", " ")}
                  </td>
                  <td className="px-4 py-2">{formatCurrency(p.price_cents)}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {p.is_active ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {p.external_url ? (
                      <a
                        className="hover:text-accent"
                        href={p.external_url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open ↗
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      className="text-muted-foreground text-xs hover:text-accent"
                      href={`/admin/coaching/${p.id}/edit`}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {(!products || products.length === 0) && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    No products yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">Recent enrollments</h2>
        <div className="overflow-hidden border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Candidate</th>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Granted</th>
                <th className="px-4 py-2 font-medium">Progress</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(enrollments ?? []).map((e) => {
                const product = Array.isArray(e.product)
                  ? e.product[0]
                  : e.product;
                const candidate = Array.isArray(e.candidate)
                  ? e.candidate[0]
                  : e.candidate;
                return (
                  <tr className="border-t border-border" key={e.id}>
                    <td className="px-4 py-2">
                      {candidate?.full_name ?? candidate?.email ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {product?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(e.granted_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {e.progress}%
                    </td>
                    <td className="px-4 py-2 capitalize text-muted-foreground">
                      {e.status}
                    </td>
                  </tr>
                );
              })}
              {(!enrollments || enrollments.length === 0) && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    No enrollments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
