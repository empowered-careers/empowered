import Link from "next/link";
import { notFound } from "next/navigation";

import { JobForm } from "@/components/admin/job-form";
import { createClient } from "@/lib/supabase/server";
import type { JobRow } from "@/types/db";

export const metadata = {
  title: "Admin · Edit job",
  robots: { index: false, follow: false },
};

export default async function AdminJobEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const job = data as JobRow | null;
  if (!job) notFound();

  return (
    <div className="space-y-6 px-10 py-8">
      <Link
        href="/admin/jobs"
        className="text-[12px] text-muted-foreground hover:text-foreground"
      >
        ← Back to jobs
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
        <JobForm job={job} />
      </div>
    </div>
  );
}
