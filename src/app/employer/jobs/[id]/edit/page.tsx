import Link from "next/link";
import { notFound } from "next/navigation";

import {
  type ClientCompanyOption,
  EmployerJobForm,
} from "@/components/employer/job-form";
import { requireEmployer } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import type { JobRow } from "@/types/db";

export const metadata = {
  title: "Employer · Edit role",
  robots: { index: false, follow: false },
};

export default async function EmployerJobEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { employerId, relationshipType } = await requireEmployer();
  const supabase = await createClient();

  const isAgency = relationshipType === "agency_partner";

  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const job = data as JobRow | null;
  if (!job) notFound();

  // Defense in depth: RLS already restricts UPDATEs, but block the editor
  // entirely if this job isn't ours.
  if (employerId && job.submitted_by !== employerId) {
    notFound();
  }

  const { data: clients } = isAgency
    ? await supabase
        .from("client_companies")
        .select("id, name")
        .eq("agency_employer_id", employerId!)
        .order("name")
    : { data: [] as ClientCompanyOption[] };

  return (
    <div className="space-y-6 px-10 py-8">
      <Link
        href="/employer/jobs"
        className="text-[12px] text-muted-foreground hover:text-foreground"
      >
        ← Back to roles
      </Link>

      <div>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          {job.title}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {job.company_name}
          {job.location ? ` · ${job.location}` : ""}
        </p>
      </div>

      <div className="border border-border bg-card p-5">
        <EmployerJobForm
          job={job}
          isAgency={isAgency}
          clientCompanies={(clients ?? []) as ClientCompanyOption[]}
        />
      </div>
    </div>
  );
}
