"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Compass,
  Crown,
  Heart,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type {
  RoleClarityResult,
  SectionKey,
} from "@/lib/assessment/role-clarity";
import { ROLE_CLARITY_MAX, SECTIONS } from "@/lib/assessment/role-clarity";
import type { BlueprintResult } from "@/lib/assessment/types";
import { cn } from "@/lib/utils";

interface AssessmentsIndexProps {
  blueprint: {
    archetype: string | null;
    completed_at: string | null;
    result: BlueprintResult | null;
  } | null;
  bigWins: {
    /** Roles rewritten so far. */
    rewritten: number;
    /** Roles on the current resume. 0 = no parsed resume yet. */
    total: number;
    completed_at: string | null;
  };
  roleClarity: {
    completed_at: string | null;
    result: RoleClarityResult | null;
  } | null;
}

interface ComingSoonAssessment {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const COMING_SOON: ComingSoonAssessment[] = [
  {
    id: "values-environment",
    icon: Heart,
    title: "Values & Environment",
    description:
      "Deeper culture-fit signal beyond the Blueprint — non-negotiables, energy gives, energy takes.",
  },
  {
    id: "strengths",
    icon: Sparkles,
    title: "Strengths",
    description:
      "Surface your zone of genius — the work where you outperform without effort.",
  },
  {
    id: "leadership-style",
    icon: Crown,
    title: "Leadership Style",
    description:
      "Granular leadership signal — team-shape, decision-speed, and the orgs you'll thrive in.",
  },
];

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

export function AssessmentsIndex({
  blueprint,
  bigWins,
  roleClarity,
}: AssessmentsIndexProps) {
  const taken = formatTakenDate(blueprint?.completed_at ?? null);
  const hasResult = !!blueprint?.result;
  const winsUpdated = formatTakenDate(bigWins.completed_at);
  const clarityResult = roleClarity?.result ?? null;
  const clarityTaken = formatTakenDate(roleClarity?.completed_at ?? null);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {/* Blueprint card (live) */}
      <article className="flex flex-col gap-4 border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-accent text-accent-foreground">
            <Compass className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-semibold text-foreground">
                Career Identity Blueprint™
              </h2>
              <span className="bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Live
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              30-question scan: archetype, leadership style, company fit,
              communication voice.
            </p>
          </div>
        </div>

        {hasResult && blueprint?.result ? (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Your archetype
              </p>
              <p className="font-display text-xl text-foreground">
                {blueprint.result.archetype.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {blueprint.result.leadership.title} ·{" "}
                {blueprint.result.commStyle.title}
                {taken ? ` · Taken ${taken}` : null}
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button asChild size="sm">
                <Link href="/assessments/ci-blueprint">View results</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/assessments/ci-blueprint">Retake</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              5–7 minutes. Powers your matches and resume/LinkedIn voice.
            </p>
            <Button asChild size="sm">
              <Link href="/assessments/ci-blueprint">Start Blueprint</Link>
            </Button>
          </div>
        )}
      </article>

      {/* Big Wins card (live) */}
      <article className="flex flex-col gap-4 border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-accent text-accent-foreground">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-semibold text-foreground">
                Big Wins
              </h2>
              <span className="bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Live
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Role-by-role Q&amp;A that pulls out your quantified impact, then
              rewrites the bullets on your resume.
            </p>
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          {bigWins.total === 0 ? (
            <>
              <p className="text-xs text-muted-foreground">
                Needs a parsed resume first — that&apos;s where the roles come
                from.
              </p>
              <Button asChild size="sm">
                <Link href="/resume">Upload your resume</Link>
              </Button>
            </>
          ) : bigWins.rewritten > 0 ? (
            <>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Progress
                </p>
                <p className="font-display text-xl text-foreground">
                  {bigWins.rewritten} of {bigWins.total} roles rewritten
                </p>
                {winsUpdated ? (
                  <p className="text-xs text-muted-foreground">
                    Updated {winsUpdated}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2 pt-1">
                <Button asChild size="sm">
                  <Link href="/assessments/big-wins">
                    {bigWins.rewritten < bigWins.total ? "Continue" : "Review"}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/resume">See my resume</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {bigWins.total} {bigWins.total === 1 ? "role" : "roles"} on your
                resume. Roughly 3–4 minutes each — do one, or all of them.
              </p>
              <Button asChild size="sm">
                <Link href="/assessments/big-wins">Start Big Wins</Link>
              </Button>
            </>
          )}
        </div>
      </article>

      {/* Role Clarity card (live) */}
      <article className="flex flex-col gap-4 border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-accent text-accent-foreground">
            <Target className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-semibold text-foreground">
                Role Clarity
              </h2>
              <span className="bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Live
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              18 questions on scope, impact, and market direction that pin down
              the titles you should actually be targeting.
            </p>
          </div>
        </div>

        {clarityResult ? (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Your result
              </p>
              <p className="font-display text-xl text-foreground">
                {clarityResult.band.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {clarityResult.overall}/{ROLE_CLARITY_MAX} · Weakest:{" "}
                {SECTIONS[clarityResult.weakest as SectionKey].title}
                {clarityTaken ? ` · Taken ${clarityTaken}` : null}
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button asChild size="sm">
                <Link href="/assessments/role-clarity">View results</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/assessments/role-clarity">Retake</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              About 5 minutes. Sharpens the target role behind your matches and
              your dashboard nudges.
            </p>
            <Button asChild size="sm">
              <Link href="/assessments/role-clarity">Start Role Clarity</Link>
            </Button>
          </div>
        )}
      </article>

      {/* Coming-soon cards */}
      {COMING_SOON.map((a) => {
        const Icon = a.icon;
        return (
          <article
            key={a.id}
            className={cn(
              "flex flex-col gap-4 border border-dashed border-border bg-muted/20 p-5",
              "opacity-80"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-muted text-muted-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-semibold text-foreground">
                    {a.title}
                  </h2>
                  <span className="bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Coming soon
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{a.description}</p>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <Button size="sm" disabled aria-disabled="true">
                <BarChart3 className="mr-2 h-4 w-4" />
                Not available yet
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
