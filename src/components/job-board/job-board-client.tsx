"use client";

import { Lock } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// MOCK DATA — replace in S4 with jobs query, scored by candidate fit
type Tier = "Tier 1" | "Tier 2" | "Tier 3";

interface SampleJob {
  id: string;
  title: string;
  company: string;
  location: string;
  tier: Tier;
  postedLabel: string;
  salary: string;
  seniority: string;
  matchPct: number;
  reasoning: string;
  locked?: boolean;
  lockSub?: string;
}

const JOBS: SampleJob[] = [
  {
    id: "vercel-1",
    title: "Director, Platform Engineering",
    company: "Vercel · Remote (US)",
    location: "Remote",
    tier: "Tier 2",
    postedLabel: "Posted 2d ago",
    salary: "$240–280k",
    seniority: "Director",
    matchPct: 84,
    reasoning:
      "Your Big Wins around developer tooling scale-up and your values match (autonomy, craft) align tightly.",
  },
  {
    id: "linear-1",
    title: "Head of Product",
    company: "Linear · Remote",
    location: "Remote",
    tier: "Tier 3",
    postedLabel: "Posted 4d ago",
    salary: "$280–340k",
    seniority: "VP",
    matchPct: 91,
    reasoning:
      "Direct-client role. Lauren placed two PMs here in 2024. Leadership style match: hands-on builder.",
  },
  {
    id: "stealth-1",
    title: "VP Engineering",
    company: "Stealth · Series B",
    location: "Remote",
    tier: "Tier 3",
    postedLabel: "Exclusive",
    salary: "$300k+",
    seniority: "VP",
    matchPct: 88,
    reasoning: "Lauren's direct client. Founder previously CTO at a unicorn.",
    locked: true,
    lockSub: "Plus 11 others this month. Plan 3 from $480/mo.",
  },
  {
    id: "notion-1",
    title: "Sr. Director, PM",
    company: "Notion · SF / Remote",
    location: "SF",
    tier: "Tier 1",
    postedLabel: "Posted 1d ago",
    salary: "$250–290k",
    seniority: "Director",
    matchPct: 76,
    reasoning:
      "Curated by Lauren. Strong values fit. Leadership style might require stretch on cross-functional buy-in.",
  },
  {
    id: "figma-1",
    title: "Director, Growth",
    company: "Figma · NY",
    location: "NY",
    tier: "Tier 2",
    postedLabel: "Posted 3d ago",
    salary: "$220–260k",
    seniority: "Director",
    matchPct: 81,
    reasoning:
      "Strong overlap on impact dimension. Your last role's growth experiments are a direct fit.",
  },
  {
    id: "stripe-1",
    title: "Director, Pricing & Packaging",
    company: "Stripe · Remote",
    location: "Remote",
    tier: "Tier 3",
    postedLabel: "Exclusive",
    salary: "$260–310k",
    seniority: "Director",
    matchPct: 93,
    reasoning: "Highest fit this month. Direct client.",
    locked: true,
    lockSub: "93% match. Unlocks today.",
  },
];

const FILTERS = [
  "All",
  "Job Tier 1",
  "Job Tier 2",
  "Job Tier 3",
  "Remote",
  "$200k+",
];

const TIER_CLASS: Record<Tier, string> = {
  "Tier 1": "bg-muted text-muted-foreground",
  "Tier 2": "bg-accent/15 text-accent",
  "Tier 3": "bg-chart-4/15 text-chart-4",
};

export function JobBoardClient() {
  const [active, setActive] = useState("All");

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-medium text-3xl tracking-tight">
            Job Board
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {JOBS.length} exclusive roles active this month. Filtered to your
            Plan.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border border-border bg-card p-3">
        {FILTERS.map((f) => (
          <button
            className={cn(
              "border px-3 py-1.5 text-[12px] transition-colors",
              active === f
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            )}
            key={f}
            onClick={() => setActive(f)}
            type="button"
          >
            {f}
          </button>
        ))}
        <button
          className="ml-auto border border-border bg-background px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          type="button"
        >
          Match 80%+
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {JOBS.map((job) => (
          <div
            className={cn(
              "relative overflow-hidden border border-border bg-card p-5 transition-colors",
              !job.locked && "hover:border-foreground/40"
            )}
            key={job.id}
          >
            <div className="mb-2 flex items-center gap-2.5">
              <span
                className={cn(
                  "px-1.5 py-0.5 font-semibold text-[10px] uppercase tracking-[0.08em]",
                  TIER_CLASS[job.tier]
                )}
              >
                {job.tier}
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                {job.postedLabel}
              </span>
            </div>
            <div
              className={cn(
                "font-medium text-[15px] text-foreground",
                job.locked && "blur-sm select-none"
              )}
            >
              {job.title}
            </div>
            <div
              className={cn(
                "mt-0.5 mb-3 text-[12.5px] text-muted-foreground",
                job.locked && "blur-sm select-none"
              )}
            >
              {job.company}
            </div>
            <div className="mb-3 flex gap-3 text-[12px] text-muted-foreground">
              <span>{job.salary}</span>
              <span>·</span>
              <span>{job.seniority}</span>
            </div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-1 flex-1 bg-muted">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${job.matchPct}%` }}
                />
              </div>
              <span className="font-semibold text-[12px] text-accent">
                {job.matchPct}%
              </span>
            </div>
            <div className="mb-4 border-accent border-l-2 bg-muted px-3 py-2.5 text-[12px] text-muted-foreground italic">
              {job.reasoning}
            </div>
            <div className="flex gap-2">
              <Button size="sm" type="button">
                Express interest
              </Button>
              {!job.locked && (
                <Button size="sm" type="button" variant="ghost">
                  Save
                </Button>
              )}
            </div>

            {job.locked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-background/60 to-background/95 p-6 text-center backdrop-blur-[2px]">
                <Lock className="mb-2.5 size-5 text-accent" />
                <div className="mb-1 font-medium text-[13px]">
                  Plan 3 unlocks this role
                </div>
                <div className="mb-3 text-[12px] text-muted-foreground">
                  {job.lockSub}
                </div>
                <Button size="sm" type="button">
                  Upgrade
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
