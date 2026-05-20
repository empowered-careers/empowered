"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

import { toggleSavedJob } from "@/app/actions/jobs";
import { ExpressInterestButton } from "@/components/job-board/express-interest-button";
import { Button } from "@/components/ui/button";
import { tierLabel } from "@/lib/plan";
import { cn } from "@/lib/utils";
import type { ApplicationStatus, JobCardFields, JobTier } from "@/types/db";

// Re-export under the legacy name for existing call sites.
export type JobCardJob = JobCardFields;

const TIER_CLASS: Record<JobTier, string> = {
  tier_1: "bg-muted text-muted-foreground",
  tier_2: "bg-accent/15 text-accent",
  tier_3: "bg-chart-4/15 text-chart-4",
};

function formatSalary(min: number | null, max: number | null) {
  if (min == null && max == null) return "Salary undisclosed";
  const fmt = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  return `up to ${fmt(max as number)}`;
}

function formatPosted(iso: string) {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  );
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted 1d ago";
  return `Posted ${days}d ago`;
}

export function JobCard({
  job,
  saved,
  applicationStatus = null,
}: {
  job: JobCardFields;
  saved: boolean;
  applicationStatus?: ApplicationStatus | null;
}) {
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      await toggleSavedJob(job.id);
    });
  };

  return (
    <div className="relative overflow-hidden border border-border bg-card p-5 transition-colors hover:border-foreground/40">
      <div className="mb-2 flex items-center gap-2.5">
        <span
          className={cn(
            "px-1.5 py-0.5 font-semibold text-[10px] uppercase tracking-[0.08em]",
            TIER_CLASS[job.job_tier]
          )}
        >
          {tierLabel[job.job_tier]}
        </span>
        <span className="text-[11.5px] text-muted-foreground">
          {formatPosted(job.posted_at)}
        </span>
      </div>

      <Link
        href={`/job-board/${job.id}`}
        className="block font-medium text-[15px] text-foreground hover:underline"
      >
        {job.title}
      </Link>
      <div className="mt-0.5 mb-3 text-[12.5px] text-muted-foreground">
        {job.company_name}
        {job.location ? ` · ${job.location}` : ""}
      </div>

      <div className="mb-4 flex gap-3 text-[12px] text-muted-foreground">
        <span>{formatSalary(job.salary_min, job.salary_max)}</span>
        <span>·</span>
        <span className="capitalize">{job.remote_policy}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <ExpressInterestButton
          jobId={job.id}
          jobTitle={job.title}
          applicationStatus={applicationStatus}
        />
        <Button asChild size="sm" variant="outline">
          <Link href={`/job-board/${job.id}`}>View role</Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={handleSave}
          disabled={pending}
          aria-pressed={saved}
        >
          {saved ? (
            <>
              <BookmarkCheck className="mr-1.5 size-4" />
              Saved
            </>
          ) : (
            <>
              <Bookmark className="mr-1.5 size-4" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
