"use client";

import { ArrowRight, Lock, Upload, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DashboardProfile, DashboardResume } from "@/hooks/use-dashboard-data";
import { isPaidUser } from "@/hooks/use-dashboard-data";

interface QuickActionsProps {
  profile: DashboardProfile | null;
  resumes: DashboardResume[];
  activeJobCount: number;
  onUploadResume?: () => void;
}

type CTAState = "no-resume" | "free-with-resume" | "paid";

function getCtaState(
  paid: boolean,
  resumes: DashboardResume[]
): CTAState {
  if (resumes.length === 0) return "no-resume";
  if (!paid) return "free-with-resume";
  return "paid";
}

export function QuickActions({
  profile,
  resumes,
  activeJobCount,
  onUploadResume,
}: QuickActionsProps) {
  const paid = isPaidUser(profile);
  const state = getCtaState(paid, resumes);

  return (
    <div className="relative overflow-hidden border border-border bg-primary p-6">
      {/* Decorative accent stripe */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-accent"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Label */}
        <div className="space-y-0.5 pl-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/60">
            Next Step
          </p>
          {state === "no-resume" && (
            <p className="font-display text-xl font-semibold text-primary-foreground">
              Upload your resume to get started
            </p>
          )}
          {state === "free-with-resume" && (
            <p className="font-display text-xl font-semibold text-primary-foreground">
              Unlock exclusive jobs curated for you
            </p>
          )}
          {state === "paid" && (
            <p className="font-display text-xl font-semibold text-primary-foreground">
              {activeJobCount} new roles this week — ready to match
            </p>
          )}
        </div>

        {/* CTA Button */}
        {state === "no-resume" && (
          <Button
            id="quick-action-upload-resume"
            onClick={onUploadResume}
            className="shrink-0 gap-2 bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
          >
            <Upload className="h-4 w-4" />
            Upload Resume
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        {state === "free-with-resume" && (
          <Button
            id="quick-action-upsell"
            className="shrink-0 gap-2 bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
          >
            <Lock className="h-4 w-4" />
            Unlock Exclusive Jobs
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        {state === "paid" && (
          <Button
            id="quick-action-browse-jobs"
            className="shrink-0 gap-2 bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
          >
            <Zap className="h-4 w-4" />
            Browse Jobs
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
