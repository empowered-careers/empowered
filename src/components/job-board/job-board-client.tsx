"use client";

import { useMemo, useState } from "react";

import { JobCard } from "@/components/job-board/job-card";
import { TierLockedBanner } from "@/components/job-board/tier-locked-banner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { canSeeJobTier } from "@/lib/plan";
import type {
  ApplicationStatus,
  JobCardFields,
  JobTier,
  Plan,
} from "@/types/db";

type FilterKey =
  | "all"
  | "tier_1"
  | "tier_2"
  | "tier_3"
  | "remote"
  | "salary_200k";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tier_1", label: "Tier 1" },
  { key: "tier_2", label: "Tier 2" },
  { key: "tier_3", label: "Tier 3" },
  { key: "remote", label: "Remote" },
  { key: "salary_200k", label: "$200k+" },
];

function matchesFilter(job: JobCardFields, filter: FilterKey): boolean {
  switch (filter) {
    case "all":
      return true;
    case "tier_1":
    case "tier_2":
    case "tier_3":
      return job.job_tier === filter;
    case "remote":
      return job.remote_policy === "remote";
    case "salary_200k":
      return (job.salary_max ?? 0) >= 200_000;
  }
}

export interface JobBoardClientProps {
  jobs: JobCardFields[];
  savedJobIds: string[];
  applicationStatusByJobId: Record<string, ApplicationStatus>;
  plan: Plan;
  needsExpressInterestPrefs: boolean;
}

export function JobBoardClient({
  jobs,
  savedJobIds,
  applicationStatusByJobId,
  plan,
  needsExpressInterestPrefs,
}: JobBoardClientProps) {
  const [active, setActive] = useState<FilterKey>("all");

  const savedSet = useMemo(() => new Set(savedJobIds), [savedJobIds]);

  const filtered = useMemo(
    () => jobs.filter((j) => matchesFilter(j, active)),
    [jobs, active]
  );

  // Group visible jobs by tier, with tier-2 / tier-3 hidden behind locked banners
  // when plan can't see them.
  const visibleByTier = useMemo(() => {
    const buckets: Record<JobTier, JobCardFields[]> = {
      tier_1: [],
      tier_2: [],
      tier_3: [],
    };
    for (const job of filtered) {
      if (canSeeJobTier(plan, job.job_tier)) buckets[job.job_tier].push(job);
    }
    return buckets;
  }, [filtered, plan]);

  const tierCounts = useMemo(() => {
    const counts: Record<JobTier, number> = { tier_1: 0, tier_2: 0, tier_3: 0 };
    for (const j of jobs) counts[j.job_tier] += 1;
    return counts;
  }, [jobs]);

  const totalVisible =
    visibleByTier.tier_1.length +
    visibleByTier.tier_2.length +
    visibleByTier.tier_3.length;

  const lockedTiers: JobTier[] = (["tier_2", "tier_3"] as const).filter(
    (t) => !canSeeJobTier(plan, t)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-medium text-3xl tracking-tight">
          Job Board
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {jobs.length} exclusive {jobs.length === 1 ? "role" : "roles"} active
          this month. Filtered to your Plan.
        </p>
      </div>

      <div className="border border-border bg-card p-3">
        <ToggleGroup
          className="w-full flex-wrap"
          onValueChange={(v) => v && setActive(v as FilterKey)}
          spacing={1}
          type="single"
          value={active}
          variant="outline"
        >
          {FILTERS.map((f) => (
            <ToggleGroupItem className="text-[12px]" key={f.key} value={f.key}>
              {f.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {totalVisible === 0 && (
        <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No roles match the current filters.
        </div>
      )}

      {(["tier_1", "tier_2", "tier_3"] as const).map((tier) => {
        const visible = visibleByTier[tier];
        if (visible.length === 0) return null;
        return (
          <div key={tier} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                saved={savedSet.has(job.id)}
                applicationStatus={applicationStatusByJobId[job.id] ?? null}
                needsExpressInterestPrefs={needsExpressInterestPrefs}
              />
            ))}
          </div>
        );
      })}

      {lockedTiers.map((tier) => (
        <TierLockedBanner key={tier} tier={tier} count={tierCounts[tier]} />
      ))}
    </div>
  );
}
