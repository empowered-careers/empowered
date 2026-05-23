import Link from "next/link";

import { requireEmployer } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/types/db";

export const metadata = {
  title: "Employer · Candidates",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  interested: "Interested",
  submitted: "Submitted",
  screening: "Screening",
  interviewing: "Interviewing",
  offer: "Offer",
  placed: "Placed",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function EmployerApplicationsPage() {
  const { employerId } = await requireEmployer();
  const supabase = await createClient();

  if (!employerId) {
    return (
      <div className="space-y-6 px-10 py-8">
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Candidates
        </h1>
        <p className="text-muted-foreground text-sm">
          Admin impersonation: use{" "}
          <Link className="underline" href="/admin/applications">
            /admin/applications
          </Link>{" "}
          to view all applications.
        </p>
      </div>
    );
  }

  // RLS (applications_read_employer) scopes by jobs.submitted_by; an explicit
  // !inner join + filter short-circuits other employers' rows on the server.
  const { data } = await supabase
    .from("applications")
    .select(
      "id, status, created_at, updated_at, candidate:profiles!applications_profile_id_fkey(id, full_name, email), job:jobs!inner(id, title, company_name, job_tier, submitted_by, client_company_id)"
    )
    .eq("job.submitted_by", employerId)
    .order("updated_at", { ascending: false });

  const apps = data ?? [];

  return (
    <div className="space-y-6 px-10 py-8">
      <section>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Candidates
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {apps.length} candidate{apps.length === 1 ? "" : "s"} have expressed
          interest. Full profile shared per their consent.
        </p>
      </section>

      <section>
        <div className="overflow-hidden border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Candidate</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Updated</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => {
                const candidate = Array.isArray(a.candidate)
                  ? a.candidate[0]
                  : a.candidate;
                const job = Array.isArray(a.job) ? a.job[0] : a.job;
                return (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      {candidate?.full_name?.trim() || candidate?.email || "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {job?.title}
                      {job?.company_name ? ` · ${job.company_name}` : ""}
                    </td>
                    <td className="px-4 py-2">
                      {STATUS_LABEL[a.status as ApplicationStatus]}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatDate(a.updated_at)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/employer/applications/${a.id}`}
                        className="text-accent hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {apps.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No expressions of interest yet.
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
