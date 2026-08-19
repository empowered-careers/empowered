"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  ROLE_CLARITY_MAX,
  type RoleClarityResult,
  SECTION_MAX,
  SECTION_ORDER,
  SECTIONS,
} from "@/lib/assessment/role-clarity";
import type { Prescription } from "@/lib/dashboard/prescribe";
import { cn } from "@/lib/utils";

interface RoleClarityResultsProps {
  result: RoleClarityResult;
  completedAt: string | null;
  prescription: Prescription | null;
  onRetake: () => void;
}

function formatTakenDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function RoleClarityResults({
  result,
  completedAt,
  prescription,
  onRetake,
}: RoleClarityResultsProps) {
  const taken = formatTakenDate(completedAt);
  const weakest = SECTIONS[result.weakest];

  return (
    <div className="space-y-8">
      {/* Band header */}
      <div className="space-y-3">
        <p className="inline-block bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-foreground">
          {result.band.label}
        </p>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          {result.band.headline}
        </h1>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Overall score: {result.overall} / {ROLE_CLARITY_MAX}
          {taken ? ` · Taken ${taken}` : null}
        </p>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {result.band.body}
        </p>
      </div>

      {/* Weakest section — the one thing to act on */}
      <div className="border-l-2 border-amber-500 bg-amber-500/10 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Your biggest opportunity right now
        </p>
        <h2 className="mt-1 font-display text-lg font-semibold text-amber-700 dark:text-amber-400">
          {weakest.title}
        </h2>
        <p className="mt-2 text-sm text-foreground">{weakest.tip}</p>
      </div>

      {/* Section bars */}
      <div className="space-y-3">
        {SECTION_ORDER.map((key) => {
          const score = result.sections[key];
          const isWeak = key === result.weakest;
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{SECTIONS[key].title}</span>
                <span className="text-xs text-muted-foreground">
                  {score}/{SECTION_MAX}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden bg-muted">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    isWeak ? "bg-amber-500" : "bg-accent"
                  )}
                  style={{ width: `${(score / SECTION_MAX) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-section tips */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Here&apos;s your action tip for every category:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTION_ORDER.map((key) => (
            <div key={key} className="border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">
                {SECTIONS[key].title}
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {SECTIONS[key].tip}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA — the prescribed product, framed by the band. Falls back to a
          plain coaching link when the engine has nothing defensible to say. */}
      <div className="bg-foreground p-6 text-center text-background">
        <h2 className="font-display text-lg font-semibold">
          {result.band.ctaHeading}
        </h2>
        {prescription ? (
          <>
            <p className="mx-auto mt-2 max-w-lg text-sm opacity-80">
              {prescription.reason}
            </p>
            <Button asChild variant="secondary" className="mt-4">
              <Link href="/pricing">{prescription.productName}</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="mx-auto mt-2 max-w-lg text-sm opacity-80">
              We&apos;ll map your target titles, industries, and next moves
              together in a focused 1:1 strategy session.
            </p>
            <Button asChild variant="secondary" className="mt-4">
              <Link href="/pricing">Book a strategy call</Link>
            </Button>
          </>
        )}
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onRetake}
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Retake the assessment
        </button>
      </div>
    </div>
  );
}
