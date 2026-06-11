import { ManageSubscriptionLink } from "@/components/billing/manage-subscription-link";
import { planLabel } from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/types/db";

export const metadata = { title: "Billing" };

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // (app) layout already guards, this satisfies types

  const [{ data: profile }, { data: payments }] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, billing_cadence, subscription_status, stripe_customer_id")
      .eq("id", user.id)
      .single(),
    supabase
      .from("payments")
      .select("id, amount, product_type, status, billing_reason, created_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const plan = (profile?.plan ?? "free") as Plan;
  const isPaid = plan !== "free";

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-2xl font-medium text-foreground">
        Billing
      </h1>

      <section className="mt-6 border border-border bg-card p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Current plan
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-display text-xl text-foreground">
              {planLabel[plan]}
            </div>
            <div className="mt-0.5 text-[13px] text-muted-foreground">
              {isPaid
                ? `${profile?.subscription_status ?? "—"}${
                    profile?.billing_cadence
                      ? ` · ${profile.billing_cadence}`
                      : ""
                  }`
                : "No active subscription"}
            </div>
          </div>
          {profile?.stripe_customer_id ? (
            <ManageSubscriptionLink />
          ) : (
            <a
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              href="/pricing"
            >
              View plans
            </a>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Payment history
        </h2>
        {payments && payments.length > 0 ? (
          <div className="border border-border">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Item</th>
                  <th className="px-4 py-2 font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-2">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-2 capitalize">
                      {p.product_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-2">{formatCents(p.amount)}</td>
                    <td className="px-4 py-2 capitalize">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">No payments yet.</p>
        )}
      </section>
    </div>
  );
}
