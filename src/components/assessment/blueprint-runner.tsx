"use client";

import type { LucideIcon } from "lucide-react";
import {
  BatteryCharging,
  Building2,
  Crown,
  MessageSquare,
  Rocket,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SECTION_META } from "@/lib/assessment/content";
import { QUESTIONS } from "@/lib/assessment/questions";
import type { Answers, BlueprintSection } from "@/lib/assessment/types";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<BlueprintSection, LucideIcon> = {
  energy: Zap,
  leadership: Crown,
  culture: Building2,
  audit: BatteryCharging,
  communication: MessageSquare,
  direction: Rocket,
};

const LETTERS = ["A", "B", "C", "D"];

interface BlueprintRunnerProps {
  currentQ: number;
  answers: Answers;
  onSelect: (qIndex: number, optIndex: number) => void;
  onBack: () => void;
  onNext: () => void;
  pending: boolean;
}

export function BlueprintRunner({
  currentQ,
  answers,
  onSelect,
  onBack,
  onNext,
  pending,
}: BlueprintRunnerProps) {
  const q = QUESTIONS[currentQ];
  const total = QUESTIONS.length;
  const selected = answers[currentQ];
  const isLast = currentQ === total - 1;
  const meta = SECTION_META[q.section];
  const Icon = SECTION_ICONS[q.section];
  const pct = Math.max(3, Math.round(((currentQ + 1) / total) * 100));

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <Icon className="h-3.5 w-3.5 text-accent" />
            {meta.label}
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
      <div className="grid gap-2.5">
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(currentQ, i)}
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
              <span className="pt-0.5 text-sm text-foreground">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

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
