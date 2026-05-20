import Link from "next/link";

import { JobForm } from "@/components/admin/job-form";
import { tierLabel } from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import { JOB_LIST_COLUMNS, type JobListFields } from "@/types/db";

export const metadata = {
  title: "Admin · Jobs",
  robots: { index: false, follow: false },
};

export default async function AdminJobsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select(JOB_LIST_COLUMNS)
    .order("posted_at", { ascending: false });
  const jobs = (data ?? []) as JobListFields[];

  return (
    <div className="space-y-10 px-10 py-8">
      <section>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Jobs
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {jobs.length} total. Create a new role below — it lands under the
          curated system employer.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">New role</h2>
        <div className="border border-border bg-card p-5">
          <JobForm />
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
              {jobs.map((job) => (
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
                      href={`/admin/jobs/${job.id}/edit`}
                      className="text-accent hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No jobs yet.
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
