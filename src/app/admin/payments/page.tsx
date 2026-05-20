import Link from "next/link";

import { GrantPlan3Form } from "@/components/admin/grant-plan3-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin · Payments",
  robots: { index: false, follow: false },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

export default async function AdminPaymentsPage() {
  const supabase = await createClient();

  const [{ data: payments }, { data: candidates }] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, amount, product_type, status, stripe_payment_intent_id, created_at, profile:profiles(id, full_name, email)"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, email, plan")
      .eq("role", "candidate")
      .order("created_at", { ascending: false }),
  ]);

  const totalCents =
    payments
      ?.filter((p) => p.status === "succeeded")
      .reduce((sum, p) => sum + p.amount, 0) ?? 0;

  return (
    <div className="space-y-10 px-10 py-8">
      <section>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Payments
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {payments?.length ?? 0} payment{payments?.length === 1 ? "" : "s"} on
          record · {formatCurrency(totalCents)} succeeded total.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-medium text-sm">Manual Plan 3 grant</h2>
        <p className="mb-3 text-muted-foreground text-xs">
          Override for comp accounts and free placements. Sets the
          candidate&apos;s plan to Plan 3 and subscription to active — no Stripe
          charge.
        </p>
        <GrantPlan3Form candidates={candidates ?? []} />
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">Ledger</h2>
        <div className="overflow-hidden border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Candidate</th>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Stripe PI</th>
                <th className="px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p) => {
                const profile = Array.isArray(p.profile)
                  ? p.profile[0]
                  : p.profile;
                return (
                  <tr className="border-t border-border" key={p.id}>
                    <td className="px-4 py-2">
                      {profile ? (
                        <Link
                          className="hover:text-accent"
                          href={`/admin/candidates/${profile.id}`}
                        >
                          {profile.full_name ?? profile.email}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2 capitalize">{p.product_type}</td>
                    <td className="px-4 py-2">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-2 capitalize text-muted-foreground">
                      {p.status}
                    </td>
                    <td className="px-4 py-2 font-mono text-muted-foreground text-xs">
                      {p.stripe_payment_intent_id}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatDate(p.created_at)}
                    </td>
                  </tr>
                );
              })}
              {(!payments || payments.length === 0) && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    No payments yet. Stripe checkout hasn&apos;t shipped —
                    manual grants above don&apos;t create payment rows.
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
