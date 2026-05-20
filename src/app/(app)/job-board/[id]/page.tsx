import { Bookmark, BookmarkCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { toggleSavedJob } from "@/app/actions/jobs";
import { ExpressInterestButton } from "@/components/job-board/express-interest-button";
import { Button } from "@/components/ui/button";
import {
  canSeeJobTier,
  planLabel,
  tierLabel,
  tierRequiredPlan,
} from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, JobRow, Plan } from "@/types/db";

export const metadata: Metadata = {
  title: "Role | Empowered Careers",
  robots: "noindex, nofollow",
};

function formatSalary(min: number | null, max: number | null) {
  if (min == null && max == null) return "Salary undisclosed";
  const fmt = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  return `up to ${fmt(max as number)}`;
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [jobResult, profileResult, savedResult, applicationResult] =
    await Promise.all([
      supabase.from("jobs").select("*").eq("id", id).maybeSingle(),
      supabase.from("profiles").select("plan").eq("id", user.id).single(),
      supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("profile_id", user.id)
        .eq("job_id", id)
        .maybeSingle(),
      supabase
        .from("applications")
        .select("status")
        .eq("profile_id", user.id)
        .eq("job_id", id)
        .maybeSingle(),
    ]);

  const job = jobResult.data as JobRow | null;
  if (!job) notFound();

  const plan = ((profileResult.data as { plan: Plan } | null)?.plan ??
    "free") as Plan;
  if (!canSeeJobTier(plan, job.job_tier)) {
    redirect("/job-board");
  }

  const saved = !!savedResult.data;
  const applicationStatus =
    (applicationResult.data as { status: ApplicationStatus } | null)?.status ??
    null;

  return (
    <div className="mx-auto max-w-3xl px-10 py-8">
      <Link
        href="/job-board"
        className="text-[12px] text-muted-foreground hover:text-foreground"
      >
        ← Back to job board
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <span className="bg-muted px-1.5 py-0.5 font-semibold text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          {tierLabel[job.job_tier]}
        </span>
        <span className="text-[11.5px] text-muted-foreground">
          {planLabel[tierRequiredPlan[job.job_tier]]} required
        </span>
      </div>

      <h1 className="mt-3 font-display font-medium text-3xl tracking-tight">
        {job.title}
      </h1>
      <p className="mt-1 text-muted-foreground text-sm">
        {job.company_name}
        {job.location ? ` · ${job.location}` : ""}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-4 border border-border bg-card p-4 text-[13px] md:grid-cols-3">
        <div>
          <dt className="text-muted-foreground text-[11px] uppercase tracking-wide">
            Salary
          </dt>
          <dd className="mt-1">
            {formatSalary(job.salary_min, job.salary_max)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-[11px] uppercase tracking-wide">
            Remote
          </dt>
          <dd className="mt-1 capitalize">{job.remote_policy}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-[11px] uppercase tracking-wide">
            Status
          </dt>
          <dd className="mt-1 capitalize">{job.status}</dd>
        </div>
      </dl>

      {job.description && (
        <div className="mt-6">
          <h2 className="mb-2 font-medium text-sm">Role</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {job.description}
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        <ExpressInterestButton
          jobId={id}
          jobTitle={job.title}
          applicationStatus={applicationStatus}
          size="default"
        />
        <form
          action={async () => {
            "use server";
            await toggleSavedJob(id);
          }}
        >
          <Button type="submit" variant={saved ? "secondary" : "outline"}>
            {saved ? (
              <>
                <BookmarkCheck className="mr-1.5 size-4" />
                Saved
              </>
            ) : (
              <>
                <Bookmark className="mr-1.5 size-4" />
                Save for later
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
