import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type { PipelineCardData } from "@/components/pipeline/pipeline-card";
import { PipelineClient } from "@/components/pipeline/pipeline-client";
import { createClient } from "@/lib/supabase/server";
import {
  type ApplicationPipelineFields,
  PIPELINE_JOB_COLUMNS,
  type PipelineJobFields,
} from "@/types/db";

export const metadata: Metadata = {
  title: "Pipeline | Empowered Careers",
  robots: "noindex, nofollow",
};

export default async function PipelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: applicationRows } = await supabase
    .from("applications")
    .select("id, job_id, status, created_at, updated_at")
    .eq("profile_id", user.id)
    .order("updated_at", { ascending: false });

  const applications = (applicationRows ?? []) as ApplicationPipelineFields[];

  let cards: PipelineCardData[] = [];
  if (applications.length > 0) {
    const jobIds = Array.from(new Set(applications.map((a) => a.job_id)));
    const { data: jobRows } = await supabase
      .from("jobs")
      .select(PIPELINE_JOB_COLUMNS)
      .in("id", jobIds);
    const jobsById = new Map<string, PipelineJobFields>();
    for (const row of (jobRows ?? []) as PipelineJobFields[]) {
      jobsById.set(row.id, row);
    }
    cards = applications
      .map((a) => {
        const job = jobsById.get(a.job_id);
        if (!job) return null;
        return {
          applicationId: a.id,
          status: a.status,
          job,
        };
      })
      .filter((c): c is PipelineCardData => c !== null);
  }

  return (
    <div className="px-10 py-8">
      <PipelineClient cards={cards} />
    </div>
  );
}
