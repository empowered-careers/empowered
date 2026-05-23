import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientCompanyForm } from "@/components/employer/client-company-form";
import { requireEmployer } from "@/lib/auth/require-role";
import { tierLabel } from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import type { JobTier } from "@/types/db";

export const metadata = {
  title: "Employer · Client",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployerClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { employerId, relationshipType } = await requireEmployer();

  if (relationshipType !== "agency_partner") {
    return (
      <div className="space-y-6 px-10 py-8">
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Clients
        </h1>
        <p className="text-muted-foreground text-sm">
          Direct-client accounts don&apos;t have client rollups.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: client } = await supabase
    .from("client_companies")
    .select("id, name, contact_name, contact_email, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const [{ data: jobs }, { data: applications }, { data: placements }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("id, title, status, job_tier, posted_at")
        .eq("client_company_id", id)
        .eq("submitted_by", employerId!)
        .order("posted_at", { ascending: false }),
      supabase
        .from("applications")
        .select(
          "id, status, updated_at, job:jobs!inner(id, title, client_company_id, submitted_by)"
        )
        .eq("job.client_company_id", id)
        .eq("job.submitted_by", employerId!)
        .order("updated_at", { ascending: false }),
      supabase
        .from("placements")
        .select("id, status, fee_amount, placed_at, job_id")
        .eq("employer_id", employerId!),
    ]);

  const jobsList = jobs ?? [];
  const jobIdsForClient = new Set(jobsList.map((j) => j.id));
  const placementsForClient = (placements ?? []).filter((p) =>
    jobIdsForClient.has(p.job_id)
  );

  return (
    <div className="space-y-8 px-10 py-8">
      <section>
        <Link
          className="text-muted-foreground text-xs hover:text-foreground"
          href="/employer/clients"
        >
          ← Clients
        </Link>
        <h1 className="mt-2 font-display font-medium text-2xl tracking-tight">
          {client.name}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {client.contact_name ?? "No contact name"}
          {client.contact_email ? ` · ${client.contact_email}` : ""}
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">Details</h2>
        <div className="border border-border bg-card p-5">
          <ClientCompanyForm
            client={{
              id: client.id,
              name: client.name,
              contact_name: client.contact_name,
              contact_email: client.contact_email,
            }}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">
          Roles posted for {client.name} ({jobsList.length})
        </h2>
        <div className="overflow-hidden border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Tier</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {jobsList.map((j) => (
                <tr key={j.id} className="border-t border-border">
                  <td className="px-4 py-2">{j.title}</td>
                  <td className="px-4 py-2">
                    {tierLabel[j.job_tier as JobTier]}
                  </td>
                  <td className="px-4 py-2 capitalize text-muted-foreground">
                    {j.status}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/employer/jobs/${j.id}/edit`}
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
                    colSpan={4}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No roles posted for this client yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="border border-border bg-card p-5">
          <h2 className="text-muted-foreground text-xs uppercase tracking-wide">
            Candidates interested
          </h2>
          <p className="mt-2 font-display font-medium text-3xl tracking-tight">
            {applications?.length ?? 0}
          </p>
          <Link
            className="mt-2 inline-block text-[12px] text-accent hover:underline"
            href="/employer/applications"
          >
            See all candidates →
          </Link>
        </div>
        <div className="border border-border bg-card p-5">
          <h2 className="text-muted-foreground text-xs uppercase tracking-wide">
            Placements
          </h2>
          <p className="mt-2 font-display font-medium text-3xl tracking-tight">
            {placementsForClient.length}
          </p>
          <Link
            className="mt-2 inline-block text-[12px] text-accent hover:underline"
            href="/employer/placements"
          >
            See all placements →
          </Link>
        </div>
      </section>
    </div>
  );
}
