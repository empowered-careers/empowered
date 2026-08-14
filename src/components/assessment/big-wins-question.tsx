"use client";

import { Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  type BigWinsCategory,
  RECONSTRUCTION_STEPS,
} from "@/lib/assessment/big-wins";

interface BigWinsQuestionProps {
  category: BigWinsCategory;
  role: { company: string; title: string };
  /** 1-based position within this role's questions. */
  position: number;
  total: number;
  value: string;
  onChange: (value: string) => void;
  /** Section 4 nudge + the dig-deeper follow-up, shown after a thin first pass. */
  nudge: string | null;
  showFlip: boolean;
  onShowFlip: () => void;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  pending: boolean;
  isLastQuestion: boolean;
}

export function BigWinsQuestion({
  category,
  role,
  position,
  total,
  value,
  onChange,
  nudge,
  showFlip,
  onShowFlip,
  onBack,
  onSkip,
  onNext,
  pending,
  isLastQuestion,
}: BigWinsQuestionProps) {
  const hasContent = value.trim().length > 0;
  const pct = Math.max(4, Math.round((position / total) * 100));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {role.title} · {role.company}
          </span>
          <span>
            {position} / {total}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden bg-muted">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {category.label}
        </p>
        <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">
          {category.ask}
        </h2>
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        placeholder="A rough number is fine — say “roughly” or “about” if you're estimating."
        aria-label={category.ask}
        className="text-sm"
      />

      {nudge && (
        <div
          role="status"
          className="space-y-2 border-l-2 border-accent bg-accent/5 py-3 pl-4 pr-3"
        >
          <p className="text-sm font-medium text-foreground">{nudge}</p>
          <p className="text-xs text-muted-foreground">{category.dig}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {showFlip ? (
          <div className="w-full space-y-1.5 border border-border bg-muted/30 p-4 text-xs">
            <p className="flex items-center gap-1.5 font-semibold uppercase tracking-wide text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5 text-accent" />
              For reference
            </p>
            <p className="text-muted-foreground line-through">
              {category.flip.before}
            </p>
            <p className="text-foreground">{category.flip.after}</p>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onShowFlip}
            disabled={!hasContent}
            title={
              hasContent
                ? undefined
                : "Take a first pass in your own words — then we'll show you an example."
            }
          >
            <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
            Show me an example
          </Button>
        )}
      </div>

      <details className="border border-border bg-card px-4 py-3 text-sm [&[open]>summary]:mb-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          I don&apos;t have a number for this
        </summary>
        <ol className="ml-4 list-decimal space-y-2 text-xs text-muted-foreground">
          {RECONSTRUCTION_STEPS.map((s) => (
            <li key={s.label}>
              <span className="font-semibold text-foreground">{s.label}:</span>{" "}
              {s.prompt}
            </li>
          ))}
        </ol>
      </details>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onBack} disabled={pending}>
          ← Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onSkip} disabled={pending}>
            Skip
          </Button>
          <Button onClick={onNext} disabled={pending || !hasContent}>
            {isLastQuestion ? "Write my bullets" : "Next"} →
          </Button>
        </div>
      </div>
    </div>
  );
}
