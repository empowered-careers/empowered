"use client";

import { useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// MOCK DATA — replace in S6 with matches/jobs query
const STAGES = [
  { key: "interested", title: "Interested" },
  { key: "submitted", title: "Submitted" },
  { key: "screening", title: "Screening" },
  { key: "interviewing", title: "Interviewing" },
  { key: "offer", title: "Offer" },
  { key: "placed", title: "Placed" },
] as const;

type Tier = "T1" | "T2" | "T3";

interface SampleCard {
  title: string;
  company: string;
  tier: Tier;
  score: number;
}

const SAMPLE: Record<(typeof STAGES)[number]["key"], SampleCard[]> = {
  interested: [
    { title: "Head of Product", company: "Linear", tier: "T3", score: 91 },
    { title: "Director, Platform", company: "Vercel", tier: "T2", score: 84 },
    { title: "VP Engineering", company: "Ramp", tier: "T3", score: 79 },
    { title: "Sr. Director PM", company: "Notion", tier: "T2", score: 76 },
  ],
  submitted: [
    { title: "VP Product", company: "Acme", tier: "T3", score: 88 },
    { title: "Director, Growth", company: "Figma", tier: "T2", score: 81 },
    { title: "Head of Eng", company: "Census", tier: "T2", score: 73 },
  ],
  screening: [
    { title: "VP Product", company: "Datadog", tier: "T3", score: 85 },
    { title: "Sr PM, Infra", company: "Cloudflare", tier: "T2", score: 77 },
  ],
  interviewing: [
    { title: "Director, Pricing", company: "Stripe", tier: "T3", score: 93 },
    { title: "Head of Product", company: "Retool", tier: "T2", score: 82 },
  ],
  offer: [{ title: "VP Eng", company: "Brex", tier: "T3", score: 89 }],
  placed: [],
};

const TIER_CLASS: Record<Tier, string> = {
  T1: "bg-muted text-muted-foreground",
  T2: "bg-accent/15 text-accent",
  T3: "bg-chart-4/15 text-chart-4",
};

export function PipelineClient() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const total = Object.values(SAMPLE).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-medium text-3xl tracking-tight">
            Pipeline
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {total} active conversations across {STAGES.length} stages.
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

      {view === "kanban" ? (
        <div className="grid grid-cols-6 gap-3.5">
          {STAGES.map((stage) => {
            const cards = SAMPLE[stage.key];
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
                    {cards.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {cards.length === 0 ? (
                    <div className="px-2 py-8 text-center text-[12px] text-muted-foreground">
                      Your first placement
                      <br />
                      starts here.
                    </div>
                  ) : (
                    cards.map((c) => (
                      <div
                        className="cursor-pointer border border-border bg-background p-3 transition-colors hover:border-foreground/40"
                        key={`${c.company}-${c.title}`}
                      >
                        <div className="mb-0.5 font-medium text-[13px] leading-tight">
                          {c.title}
                        </div>
                        <div className="mb-2 text-[11.5px] text-muted-foreground">
                          {c.company}
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 font-semibold text-[10px] uppercase tracking-[0.08em]",
                              TIER_CLASS[c.tier]
                            )}
                          >
                            {c.tier}
                          </span>
                          <span className="font-semibold text-accent">
                            {c.score}%
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-border bg-card">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-border border-b text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Company</th>
                <th className="px-4 py-3 text-left font-medium">Stage</th>
                <th className="px-4 py-3 text-left font-medium">Tier</th>
                <th className="px-4 py-3 text-right font-medium">Match</th>
              </tr>
            </thead>
            <tbody>
              {STAGES.flatMap((s) =>
                SAMPLE[s.key].map((c) => (
                  <tr
                    className="border-border border-b last:border-0"
                    key={`${s.key}-${c.company}-${c.title}`}
                  >
                    <td className="px-4 py-3">{c.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.company}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.title}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "px-1.5 py-0.5 font-semibold text-[10px] uppercase tracking-[0.08em]",
                          TIER_CLASS[c.tier]
                        )}
                      >
                        {c.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-accent">
                      {c.score}%
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
