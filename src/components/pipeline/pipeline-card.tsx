"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { withdrawApplication } from "@/app/actions/jobs";
import { Button } from "@/components/ui/button";
import { tierLabel } from "@/lib/plan";
import { cn } from "@/lib/utils";
import type { ApplicationStatus, JobTier, PipelineJobFields } from "@/types/db";

const TIER_CLASS: Record<JobTier, string> = {
  tier_1: "bg-muted text-muted-foreground",
  tier_2: "bg-accent/15 text-accent",
  tier_3: "bg-chart-4/15 text-chart-4",
};

export interface PipelineCardData {
  applicationId: string;
  status: ApplicationStatus;
  job: PipelineJobFields;
}

export function PipelineCard({ data }: { data: PipelineCardData }) {
  const [pending, startTransition] = useTransition();

  const canWithdraw =
    data.status === "interested" || data.status === "submitted";

  const handleWithdraw = () => {
    startTransition(async () => {
      const result = await withdrawApplication(data.applicationId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast("Withdrawn from this role.");
    });
  };

  return (
    <div className="cursor-default border border-border bg-background p-3 transition-colors hover:border-foreground/40">
      <div className="mb-0.5 font-medium text-[13px] leading-tight">
        {data.job.title}
      </div>
      <div className="mb-2 text-[11.5px] text-muted-foreground">
        {data.job.company_name}
      </div>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "px-1.5 py-0.5 font-semibold text-[10px] uppercase tracking-[0.08em]",
            TIER_CLASS[data.job.job_tier]
          )}
        >
          {tierLabel[data.job.job_tier]}
        </span>
        {canWithdraw && (
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={handleWithdraw}
            disabled={pending}
            className="h-6 px-2 text-[11px]"
          >
            Withdraw
          </Button>
        )}
      </div>
    </div>
  );
}
