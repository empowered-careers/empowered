"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { BlueprintResult } from "@/lib/assessment/types";

interface BlueprintSummarySectionProps {
  blueprint: {
    archetype: string | null;
    completed_at: string | null;
    result: BlueprintResult | null;
  } | null;
}

export function BlueprintSummarySection({
  blueprint,
}: BlueprintSummarySectionProps) {
  if (!blueprint || !blueprint.result) {
    return (
      <section className="border border-dashed border-border bg-muted/30 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="space-y-1">
              <h2 className="font-display text-base font-semibold text-foreground">
                Career Identity Blueprint
              </h2>
              <p className="text-sm text-muted-foreground">
                Take the 30-question scan to unlock your archetype, leadership
                style, and best company fit.
              </p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link href="/assessments/ci-blueprint">Start</Link>
          </Button>
        </div>
      </section>
    );
  }

  const { result } = blueprint;
  return (
    <section className="border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="font-display text-base font-semibold text-foreground">
              Career Identity Blueprint
            </h2>
          </div>
          <p className="text-lg font-medium text-foreground">
            {result.archetype.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {result.leadership.title} · {result.commStyle.title}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/assessments/ci-blueprint">View / Retake</Link>
        </Button>
      </div>
    </section>
  );
}
