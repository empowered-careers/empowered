import Link from "next/link";

import { CommissionStatusMover } from "@/components/admin/commission-status-mover";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin · Commissions",
  robots: { index: false, follow: false },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(cents: number | null): string {
  if (cents === null) return "—";
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default async function AdminCommissionsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("commissions")
    .select(
      "id, amount_cents, rate, status, invoiced_at, paid_at, created_at, employer:employers(id, company_name), placement:placements(id, profile_id, job_id, candidate:profiles!placements_profile_id_fkey(full_name, email), job:jobs(title))"
    )
    .order("created_at", { ascending: false });

  const totals = (data ?? []).reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + c.amount_cents;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6 px-10 py-8">
      <section>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Commissions
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {data?.length ?? 0} commission{data?.length === 1 ? "" : "s"} ·
          Pending {formatCurrency(totals.pending ?? 0)} · Invoiced{" "}
          {formatCurrency(totals.invoiced ?? 0)} · Paid{" "}
          {formatCurrency(totals.paid ?? 0)}
        </p>
      </section>

      <div className="overflow-hidden border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Employer</th>
              <th className="px-4 py-2 font-medium">Candidate</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Rate</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Invoiced</th>
              <th className="px-4 py-2 font-medium">Paid</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((c) => {
              const employer = Array.isArray(c.employer)
                ? c.employer[0]
                : c.employer;
              const placement = Array.isArray(c.placement)
                ? c.placement[0]
                : c.placement;
              const candidate = placement
                ? Array.isArray(placement.candidate)
                  ? placement.candidate[0]
                  : placement.candidate
                : null;
              const job = placement
                ? Array.isArray(placement.job)
                  ? placement.job[0]
                  : placement.job
                : null;
              return (
                <tr className="border-t border-border" key={c.id}>
                  <td className="px-4 py-2">
                    {employer ? (
                      <Link
                        className="hover:text-accent"
                        href={`/admin/employers/${employer.id}`}
                      >
                        {employer.company_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {candidate?.full_name ?? candidate?.email ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {job?.title ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {c.rate ? `${(c.rate * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {formatCurrency(c.amount_cents)}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {formatDate(c.invoiced_at)}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {formatDate(c.paid_at)}
                  </td>
                  <td className="px-4 py-2">
                    <CommissionStatusMover
                      commissionId={c.id}
                      currentStatus={c.status}
                    />
                  </td>
                </tr>
              );
            })}
            {(!data || data.length === 0) && (
              <tr>
                <td
                  className="px-4 py-6 text-center text-muted-foreground"
                  colSpan={8}
                >
                  No commissions yet. They&apos;re created automatically when an
                  agency-partner placement is marked.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
