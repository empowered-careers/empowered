"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  PipelineCard,
  type PipelineCardData,
} from "@/components/pipeline/pipeline-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ApplicationStatus } from "@/types/db";

const STAGES: { key: ApplicationStatus; title: string }[] = [
  { key: "interested", title: "Interested" },
  { key: "submitted", title: "Submitted" },
  { key: "screening", title: "Screening" },
  { key: "interviewing", title: "Interviewing" },
  { key: "offer", title: "Offer" },
  { key: "placed", title: "Placed" },
  { key: "rejected", title: "Rejected" },
  { key: "withdrawn", title: "Withdrawn" },
];

export interface PipelineClientProps {
  cards: PipelineCardData[];
}

export function PipelineClient({ cards }: PipelineClientProps) {
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const byStage = useMemo(() => {
    const buckets: Record<ApplicationStatus, PipelineCardData[]> = {
      interested: [],
      submitted: [],
      screening: [],
      interviewing: [],
      offer: [],
      placed: [],
      rejected: [],
      withdrawn: [],
    };
    for (const c of cards) buckets[c.status].push(c);
    return buckets;
  }, [cards]);

  const active = cards.filter(
    (c) => c.status !== "rejected" && c.status !== "withdrawn"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-medium text-3xl tracking-tight">
            Pipeline
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {active} active {active === 1 ? "conversation" : "conversations"}{" "}
            across {STAGES.length} stages.
          </p>
        </div>
        <Tabs
          onValueChange={(v) => setView(v as "kanban" | "list")}
          value={view}
        >
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {cards.length === 0 && (
        <div className="border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          You haven&apos;t expressed interest in any roles yet. Head to the{" "}
          <Link href="/job-board" className="text-foreground underline">
            job board
          </Link>{" "}
          to start your pipeline.
        </div>
      )}

      {cards.length > 0 && view === "kanban" && (
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4 xl:grid-cols-8">
          {STAGES.map((stage) => {
            const stageCards = byStage[stage.key];
            return (
              <div
                className="min-h-[480px] border border-border bg-card p-3"
                key={stage.key}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.06em]">
                    {stage.title}
                  </span>
                  <span className="bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {stageCards.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {stageCards.length === 0 ? (
                    <div className="px-2 py-8 text-center text-[12px] text-muted-foreground">
                      —
                    </div>
                  ) : (
                    stageCards.map((c) => (
                      <PipelineCard key={c.applicationId} data={c} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cards.length > 0 && view === "list" && (
        <div className="border border-border bg-card">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-border border-b text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Company</th>
                <th className="px-4 py-3 text-left font-medium">Stage</th>
                <th className="px-4 py-3 text-left font-medium">Tier</th>
              </tr>
            </thead>
            <tbody>
              {STAGES.flatMap((s) =>
                byStage[s.key].map((c) => (
                  <tr
                    className="border-border border-b last:border-0"
                    key={c.applicationId}
                  >
                    <td className="px-4 py-3">{c.job.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.job.company_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.title}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">
                      {c.job.job_tier.replace("_", " ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
