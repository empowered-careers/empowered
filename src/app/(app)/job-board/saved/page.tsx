import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { JobCard } from "@/components/job-board/job-card";
import { canSeeJobTier } from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import { JOB_CARD_COLUMNS, type JobCardFields, type Plan } from "@/types/db";

export const metadata: Metadata = {
  title: "Saved roles | Empowered Careers",
  robots: "noindex, nofollow",
};

export default async function SavedJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [savedResult, profileResult] = await Promise.all([
    supabase
      .from("saved_jobs")
      .select("job_id, created_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("plan").eq("id", user.id).single(),
  ]);

  const plan = ((profileResult.data as { plan: Plan } | null)?.plan ??
    "free") as Plan;
  const savedIds = ((savedResult.data ?? []) as { job_id: string }[]).map(
    (r) => r.job_id
  );

  let jobs: JobCardFields[] = [];
  if (savedIds.length > 0) {
    const { data: jobRows } = await supabase
      .from("jobs")
      .select(`${JOB_CARD_COLUMNS}, status`)
      .in("id", savedIds)
      .eq("status", "active");
    const ordered = new Map(savedIds.map((id, i) => [id, i]));
    jobs = ((jobRows ?? []) as (JobCardFields & { status: string })[])
      .filter((j) => canSeeJobTier(plan, j.job_tier))
      .sort((a, b) => (ordered.get(a.id) ?? 0) - (ordered.get(b.id) ?? 0));
  }

  return (
    <div className="px-10 py-8">
      <div className="mb-6">
        <h1 className="font-display font-medium text-3xl tracking-tight">
          Saved roles
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {jobs.length} {jobs.length === 1 ? "role" : "roles"} bookmarked.
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          You haven&apos;t saved any roles yet.{" "}
          <Link href="/job-board" className="text-foreground underline">
            Browse the job board
          </Link>
          .
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} saved />
          ))}
        </div>
      )}
    </div>
  );
}
