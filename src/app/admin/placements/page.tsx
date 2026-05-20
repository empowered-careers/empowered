import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin · Placements",
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

export default async function AdminPlacementsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("placements")
    .select(
      "id, placed_at, fee_amount, salary, status, start_date, candidate:profiles!placements_profile_id_fkey(id, full_name, email), job:jobs(id, title, company_name), employer:employers(id, company_name, relationship_type)"
    )
    .order("placed_at", { ascending: false });

  const totalFee = data?.reduce((sum, p) => sum + (p.fee_amount ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6 px-10 py-8">
      <section>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Placements
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {data?.length ?? 0} placement{data?.length === 1 ? "" : "s"} on record
          · {formatCurrency(totalFee)} in fees.
        </p>
      </section>

      <div className="overflow-hidden border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Candidate</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Employer</th>
              <th className="px-4 py-2 font-medium">Placed</th>
              <th className="px-4 py-2 font-medium">Start</th>
              <th className="px-4 py-2 font-medium">Salary</th>
              <th className="px-4 py-2 font-medium">Fee</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((p) => {
              const candidate = Array.isArray(p.candidate)
                ? p.candidate[0]
                : p.candidate;
              const job = Array.isArray(p.job) ? p.job[0] : p.job;
              const employer = Array.isArray(p.employer)
                ? p.employer[0]
                : p.employer;
              return (
                <tr className="border-t border-border" key={p.id}>
                  <td className="px-4 py-2">
                    {candidate ? (
                      <Link
                        className="hover:text-accent"
                        href={`/admin/candidates/${candidate.id}`}
                      >
                        {candidate.full_name ?? candidate.email}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {job?.title ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {employer?.company_name ?? "—"}
                    {employer?.relationship_type === "agency_partner" && (
                      <span className="ml-1 text-[11px] text-accent">
                        agency
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {formatDate(p.placed_at)}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {formatDate(p.start_date)}
                  </td>
                  <td className="px-4 py-2">{formatCurrency(p.salary)}</td>
                  <td className="px-4 py-2">{formatCurrency(p.fee_amount)}</td>
                  <td className="px-4 py-2 capitalize text-muted-foreground">
                    {p.status}
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
                  No placements yet. Use &ldquo;Mark as placed&rdquo; on an
                  application detail page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
