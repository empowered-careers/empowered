"use client";

import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Crown,
  Globe2,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  QUESTIONS,
  type RoleClarityAnswers,
  type SectionKey,
  SECTIONS,
} from "@/lib/assessment/role-clarity";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<SectionKey, LucideIcon> = {
  title: Target,
  scope: Zap,
  company: Building2,
  industry: Globe2,
  leadership: Crown,
  market: TrendingUp,
};

const LETTERS = ["A", "B", "C", "D"];
const LIKERT = [1, 2, 3, 4, 5];

interface RoleClarityRunnerProps {
  currentQ: number;
  answers: RoleClarityAnswers;
  onSelect: (qIndex: number, optIndex: number) => void;
  onBack: () => void;
  onNext: () => void;
  pending: boolean;
}

export function RoleClarityRunner({
  currentQ,
  answers,
  onSelect,
  onBack,
  onNext,
  pending,
}: RoleClarityRunnerProps) {
  const q = QUESTIONS[currentQ];
  const total = QUESTIONS.length;
  const selected = answers[currentQ];
  const isLast = currentQ === total - 1;
  const section = SECTIONS[q.section];
  const Icon = SECTION_ICONS[q.section];
  const pct = Math.max(3, Math.round(((currentQ + 1) / total) * 100));

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <Icon className="h-3.5 w-3.5 text-accent" />
            {section.title}
          </span>
          <span>
            {currentQ + 1} / {total}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden bg-muted">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Question {currentQ + 1} of {total}
        </p>
        <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">
          {q.text}
        </h2>
      </div>

      {/* Options */}
      {q.kind === "likert" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{q.low}</span>
            <span>{q.high}</span>
          </div>
          <div className="grid grid-cols-5 gap-2.5">
            {LIKERT.map((n, i) => {
              const isSelected = selected === i;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onSelect(currentQ, i)}
                  aria-label={`${n} out of 5, ${n === 1 ? q.low : n === 5 ? q.high : "middle"}`}
                  aria-pressed={isSelected}
                  className={cn(
                    "border py-5 text-center text-base font-semibold transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:bg-muted/40"
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid gap-2.5">
          {q.options.map((label, i) => {
            const isSelected = selected === i;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onSelect(currentQ, i)}
                aria-pressed={isSelected}
                className={cn(
                  "flex items-start gap-3 border bg-card p-4 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-foreground/30 hover:bg-muted/40"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center text-xs font-semibold",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {LETTERS[i]}
                </span>
                <span className="pt-0.5 text-sm text-foreground">{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Nav */}
      <div className="flex justify-between pt-2">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={currentQ === 0 || pending}
        >
          ← Back
        </Button>
        <Button onClick={onNext} disabled={selected === undefined || pending}>
          {isLast ? "See My Results" : "Next"} →
        </Button>
      </div>
    </div>
  );
}
