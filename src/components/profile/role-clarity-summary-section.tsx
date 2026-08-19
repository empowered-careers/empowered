"use client";

import { Target } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  ROLE_CLARITY_MAX,
  type RoleClarityResult,
  SECTIONS,
} from "@/lib/assessment/role-clarity";

interface RoleClaritySummarySectionProps {
  roleClarity: {
    completed_at: string | null;
    result: RoleClarityResult | null;
  } | null;
}

export function RoleClaritySummarySection({
  roleClarity,
}: RoleClaritySummarySectionProps) {
  if (!roleClarity || !roleClarity.result) {
    return (
      <section className="border border-dashed border-border bg-muted/30 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Target className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="space-y-1">
              <h2 className="font-display text-base font-semibold text-foreground">
                Role Clarity
              </h2>
              <p className="text-sm text-muted-foreground">
                Take the 18-question scan to pin down the titles you should
                actually be targeting, and where your search is still fuzzy.
              </p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link href="/assessments/role-clarity">Start</Link>
          </Button>
        </div>
      </section>
    );
  }

  const { result } = roleClarity;
  return (
    <section className="border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            <h2 className="font-display text-base font-semibold text-foreground">
              Role Clarity
            </h2>
          </div>
          <p className="text-lg font-medium text-foreground">
            {result.band.label}
          </p>
          <p className="text-sm text-muted-foreground">
            {result.overall}/{ROLE_CLARITY_MAX} · Weakest:{" "}
            {SECTIONS[result.weakest].title}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/assessments/role-clarity">View / Retake</Link>
        </Button>
      </div>
    </section>
  );
}
