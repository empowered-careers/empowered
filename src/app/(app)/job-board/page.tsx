import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { JobBoardClient } from "@/components/job-board/job-board-client";
import { createClient } from "@/lib/supabase/server";
import {
  type ApplicationStatus,
  JOB_CARD_COLUMNS,
  type JobCardFields,
  type Plan,
} from "@/types/db";

export const metadata: Metadata = {
  title: "Job Board | Empowered Careers",
  robots: "noindex, nofollow",
};

export default async function JobBoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [jobsResult, savedResult, applicationsResult, profileResult] =
    await Promise.all([
      supabase
        .from("jobs")
        .select(JOB_CARD_COLUMNS)
        .eq("status", "active")
        .order("posted_at", { ascending: false }),
      supabase.from("saved_jobs").select("job_id").eq("profile_id", user.id),
      supabase
        .from("applications")
        .select("job_id, status")
        .eq("profile_id", user.id),
      supabase.from("profiles").select("plan").eq("id", user.id).single(),
    ]);

  const jobs = (jobsResult.data ?? []) as JobCardFields[];
  const savedJobIds = ((savedResult.data ?? []) as { job_id: string }[]).map(
    (r) => r.job_id
  );
  const applicationStatusByJobId: Record<string, ApplicationStatus> = {};
  for (const row of (applicationsResult.data ?? []) as {
    job_id: string;
    status: ApplicationStatus;
  }[]) {
    applicationStatusByJobId[row.job_id] = row.status;
  }
  const plan = ((profileResult.data as { plan: Plan } | null)?.plan ??
    "free") as Plan;

  return (
    <div className="px-10 py-8">
      <JobBoardClient
        jobs={jobs}
        savedJobIds={savedJobIds}
        applicationStatusByJobId={applicationStatusByJobId}
        plan={plan}
      />
    </div>
  );
}
