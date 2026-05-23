import Link from "next/link";

import {
  type ClientCompanyOption,
  EmployerJobForm,
} from "@/components/employer/job-form";
import { requireEmployer } from "@/lib/auth/require-role";
import { tierLabel } from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import { JOB_LIST_COLUMNS, type JobListFields } from "@/types/db";

export const metadata = {
  title: "Employer · Roles",
  robots: { index: false, follow: false },
};

export default async function EmployerJobsPage() {
  const { employerId, relationshipType } = await requireEmployer();
  const supabase = await createClient();

  const isAgency = relationshipType === "agency_partner";

  // Admin impersonation: surface a redirect-style empty state.
  if (!employerId) {
    return (
      <div className="space-y-6 px-10 py-8">
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Roles
        </h1>
        <p className="text-muted-foreground text-sm">
          Admin view: use{" "}
          <Link className="underline" href="/admin/jobs">
            /admin/jobs
          </Link>{" "}
          to manage all roles.
        </p>
      </div>
    );
  }

  const [{ data: jobs }, { data: clients }] = await Promise.all([
    supabase
      .from("jobs")
      .select(JOB_LIST_COLUMNS)
      .eq("submitted_by", employerId)
      .order("posted_at", { ascending: false }),
    isAgency
      ? supabase
          .from("client_companies")
          .select("id, name")
          .eq("agency_employer_id", employerId)
          .order("name")
      : Promise.resolve({ data: [] as ClientCompanyOption[] }),
  ]);

  const jobsList = (jobs ?? []) as JobListFields[];
  const clientCompanies = (clients ?? []) as ClientCompanyOption[];

  return (
    <div className="space-y-10 px-10 py-8">
      <section>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Roles
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {jobsList.length} total. New roles post as Tier 2 — reach out if you
          need higher visibility.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">New role</h2>
        <div className="border border-border bg-card p-5">
          <EmployerJobForm
            isAgency={isAgency}
            clientCompanies={clientCompanies}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">All roles</h2>
        <div className="overflow-hidden border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Tier</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {jobsList.map((job) => (
                <tr key={job.id} className="border-t border-border">
                  <td className="px-4 py-2">{job.title}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {job.company_name}
                  </td>
                  <td className="px-4 py-2">{tierLabel[job.job_tier]}</td>
                  <td className="px-4 py-2 capitalize text-muted-foreground">
                    {job.status}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/employer/jobs/${job.id}/edit`}
                      className="text-accent hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {jobsList.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No roles posted yet.
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
