import Link from "next/link";

import { requireEmployer } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Employer · Placements",
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

function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default async function EmployerPlacementsPage() {
  const { employerId, relationshipType } = await requireEmployer();
  const supabase = await createClient();

  if (!employerId) {
    return (
      <div className="space-y-6 px-10 py-8">
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Placements
        </h1>
        <p className="text-muted-foreground text-sm">
          Admin impersonation: use{" "}
          <Link className="underline" href="/admin/placements">
            /admin/placements
          </Link>
          .
        </p>
      </div>
    );
  }

  const isAgency = relationshipType === "agency_partner";

  const { data: placements } = await supabase
    .from("placements")
    .select(
      "id, placed_at, start_date, salary, fee_amount, status, notes, candidate:profiles!placements_profile_id_fkey(id, full_name, email), job:jobs(id, title, company_name, client_company_id, client:client_companies(id, name))"
    )
    .eq("employer_id", employerId)
    .order("placed_at", { ascending: false });

  const rows = placements ?? [];

  // Group by client_company for agencies. Map: client_id|null -> rows.
  const byClient = new Map<
    string | null,
    { clientName: string | null; rows: typeof rows }
  >();
  if (isAgency) {
    for (const r of rows) {
      const job = Array.isArray(r.job) ? r.job[0] : r.job;
      const client = job
        ? Array.isArray(job.client)
          ? job.client[0]
          : job.client
        : null;
      const key = client?.id ?? null;
      if (!byClient.has(key)) {
        byClient.set(key, { clientName: client?.name ?? null, rows: [] });
      }
      byClient.get(key)!.rows.push(r);
    }
  }

  return (
    <div className="space-y-8 px-10 py-8">
      <section>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Placements
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {rows.length} placement{rows.length === 1 ? "" : "s"}. Empowered
          Careers records and reconciles every placement — reach out if anything
          looks off.
        </p>
      </section>

      {!isAgency && <PlacementsTable rows={rows as PlacementRow[]} />}

      {isAgency &&
        Array.from(byClient.entries()).map(([key, group]) => (
          <section key={key ?? "unassigned"}>
            <h2 className="mb-3 font-medium text-sm">
              {group.clientName ?? "Unassigned"} ({group.rows.length})
            </h2>
            <PlacementsTable rows={group.rows as PlacementRow[]} />
          </section>
        ))}

      {isAgency && rows.length === 0 && <PlacementsTable rows={[]} />}
    </div>
  );
}

interface PlacementCandidate {
  id: string;
  full_name: string | null;
  email: string;
}

interface PlacementJob {
  id: string;
  title: string;
  company_name: string;
  client_company_id: string | null;
}

interface PlacementRow {
  id: string;
  placed_at: string;
  start_date: string | null;
  salary: number | null;
  fee_amount: number | null;
  status: string;
  candidate: PlacementCandidate | PlacementCandidate[] | null;
  job: PlacementJob | PlacementJob[] | null;
}

function PlacementsTable({ rows }: { rows: PlacementRow[] }) {
  return (
    <div className="overflow-hidden border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Candidate</th>
            <th className="px-4 py-2 font-medium">Role</th>
            <th className="px-4 py-2 font-medium">Placed</th>
            <th className="px-4 py-2 font-medium">Start</th>
            <th className="px-4 py-2 font-medium">Salary</th>
            <th className="px-4 py-2 font-medium">Fee</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const candidate = Array.isArray(r.candidate)
              ? r.candidate[0]
              : r.candidate;
            const job = Array.isArray(r.job) ? r.job[0] : r.job;
            return (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2">
                  {candidate?.full_name?.trim() || candidate?.email || "—"}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {job?.title}
                  {job?.company_name ? ` · ${job.company_name}` : ""}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {formatDate(r.placed_at)}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {formatDate(r.start_date)}
                </td>
                <td className="px-4 py-2">{formatCurrency(r.salary)}</td>
                <td className="px-4 py-2">{formatCurrency(r.fee_amount)}</td>
                <td className="px-4 py-2 capitalize text-muted-foreground">
                  {r.status}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-6 text-center text-muted-foreground"
              >
                No placements yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
