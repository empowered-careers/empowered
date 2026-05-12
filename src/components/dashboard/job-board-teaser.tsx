"use client";

import { Button } from "@/components/ui/button";
import type { DashboardProfile } from "@/hooks/use-dashboard-data";
import { isPaidUser } from "@/hooks/use-dashboard-data";
import {
  ArrowRight,
  Briefcase,
  Lock,
  MapPin,
  Building2,
  BadgeDollarSign,
} from "lucide-react";

interface JobBoardTeaserProps {
  profile: DashboardProfile | null;
  activeJobCount: number;
}

/** Fake job data shown as blurred preview to free-tier users */
const TEASER_JOBS = [
  {
    id: "teaser-1",
    title: "Senior Product Manager",
    company: "TechCorp",
    location: "San Francisco, CA",
    salary: "$150k – $190k",
    tag: "Remote",
  },
  {
    id: "teaser-2",
    title: "Head of Growth",
    company: "GrowthCo",
    location: "New York, NY",
    salary: "$130k – $170k",
    tag: "Hybrid",
  },
  {
    id: "teaser-3",
    title: "Engineering Manager",
    company: "Stealth Startup",
    location: "Austin, TX",
    salary: "$160k – $200k",
    tag: "Onsite",
  },
];

function JobRow({
  title,
  company,
  location,
  salary,
  tag,
  blurred,
}: {
  title: string;
  company: string;
  location: string;
  salary: string;
  tag: string;
  blurred?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between border-b border-border px-5 py-4 last:border-b-0 transition-colors ${
        blurred ? "select-none blur-[3px]" : "hover:bg-muted/40"
      }`}
      aria-hidden={blurred}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center bg-muted">
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{company}</span>
            <span>·</span>
            <MapPin className="h-3 w-3" />
            <span>{location}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs font-semibold text-foreground">{salary}</span>
        <span className="border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {tag}
        </span>
      </div>
    </div>
  );
}

export function JobBoardTeaser({
  profile,
  activeJobCount,
}: JobBoardTeaserProps) {
  const paid = isPaidUser(profile);

  return (
    <div className="flex flex-col border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold text-foreground">
            Exclusive Job Board
          </h2>
        </div>
        {paid && (
          <span className="text-xs font-semibold text-muted-foreground">
            {activeJobCount} active roles
          </span>
        )}
      </div>

      {paid ? (
        /* ── Paid: full access ── */
        <div className="flex flex-1 flex-col">
          {/* Placeholder rows for paid users */}
          <div className="flex-1">
            {TEASER_JOBS.map((job) => (
              <JobRow key={job.id} {...job} blurred={false} />
            ))}
          </div>
          <div className="border-t border-border p-5">
            <Button
              id="job-board-browse-btn"
              className="w-full gap-2 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Briefcase className="h-4 w-4" />
              Browse All {activeJobCount} Roles
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        /* ── Free: blurred + upsell ── */
        <div className="relative flex-1">
          {/* Blurred job preview */}
          <div>
            {TEASER_JOBS.map((job) => (
              <JobRow key={job.id} {...job} blurred />
            ))}
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 p-6 text-center backdrop-blur-[1px]">
            <div className="mb-3 flex h-12 w-12 items-center justify-center border border-border bg-muted">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mb-1 font-display text-lg font-semibold text-foreground">
              Members-only roles
            </p>
            <p className="mb-5 text-sm text-muted-foreground">
              Subscribe to unlock {activeJobCount} exclusive jobs curated by our
              career team — not on any job board.
            </p>
            <Button
              id="job-board-upsell-btn"
              className="gap-2 bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
            >
              <BadgeDollarSign className="h-4 w-4" />
              Unlock Exclusive Jobs
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
