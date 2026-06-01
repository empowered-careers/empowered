"use client";

import type { LucideProps } from "lucide-react";
import {
  Award,
  BatteryCharging,
  Building2,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { type ComponentType, type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BlueprintResult } from "@/lib/assessment/types";
import { cn } from "@/lib/utils";

interface BlueprintResultsProps {
  result: BlueprintResult;
  onRetake: () => void;
}

export function BlueprintResults({ result, onRetake }: BlueprintResultsProps) {
  const [retakeOpen, setRetakeOpen] = useState(false);
  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="bg-foreground p-8 text-background sm:p-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-background/60">
          Your Career Archetype
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
          {result.archetype.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-background/80 sm:text-base">
          {result.archetype.tagline}
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card icon={Award} title={result.leadership.title}>
          <p className="text-sm text-muted-foreground">
            {result.leadership.body}
          </p>
          <TagRow tags={result.leadership.tags} tone="navy" />
        </Card>

        <Card icon={Building2} title={result.companyFit.title}>
          <p className="text-sm text-muted-foreground">
            {result.companyFit.body}
          </p>
          <TagRow tags={result.companyFit.tags} tone="gold" />
        </Card>

        <Card icon={Sparkles} title="Personality dimensions">
          <div className="space-y-3">
            {result.spectrums.map((s) => (
              <SpectrumRow key={s.label_left} {...s} />
            ))}
          </div>
        </Card>

        <Card icon={Award} title="Career Symmetry Score™">
          <div className="space-y-2.5">
            {result.symmetry.map((s) => (
              <SymmetryBar key={s.label} {...s} />
            ))}
          </div>
        </Card>

        <Card
          icon={CheckCircle2}
          title="Green-light zones"
          iconClassName="text-emerald-500"
        >
          <TagRow tags={result.greenLight} tone="green" />
        </Card>

        <Card
          icon={XCircle}
          title="Red-light drains"
          iconClassName="text-rose-500"
        >
          <TagRow tags={result.redLight} tone="red" />
        </Card>

        <Card icon={MessageSquare} title={result.commStyle.title}>
          <p className="text-sm text-muted-foreground">
            {result.commStyle.body}
          </p>
        </Card>

        <Card
          icon={BatteryCharging}
          title={`Burnout — ${result.burnout.title}`}
        >
          <p className="text-sm text-muted-foreground">{result.burnout.body}</p>
          <BurnoutMeter pct={result.burnout.pct} />
        </Card>
      </div>

      <Card
        icon={Sparkles}
        title={`Interview strategy for ${result.commStyle.title}`}
      >
        <InsightList items={result.interview} />
      </Card>

      <Card icon={Building2} title="Where you'll create the most impact">
        <InsightList items={result.strategy} />
      </Card>

      <Card
        icon={MessageSquare}
        title={`LinkedIn positioning for ${result.commStyle.title}`}
      >
        <InsightList items={result.linkedin} />
      </Card>

      {/* CTA band */}
      <section className="flex flex-col items-start gap-4 bg-foreground p-6 text-background sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">
            Want to go deeper?
          </h3>
          <p className="text-sm text-background/70">
            Unlock the Deep Dive Intelligence™ suite — personalised coaching and
            executive-search alignment from our team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setRetakeOpen(true)}
            className="border-background/20 bg-transparent text-background hover:bg-background/10 hover:text-background"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retake
          </Button>
          <Button asChild>
            <a href="/dashboard">Unlock Deep Dive Intelligence™ →</a>
          </Button>
        </div>
      </section>

      <Dialog open={retakeOpen} onOpenChange={setRetakeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retake the Blueprint?</DialogTitle>
            <DialogDescription>
              This replaces your current Blueprint result — no history is kept.
              You'll need to answer all 30 questions again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetakeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setRetakeOpen(false);
                onRetake();
              }}
            >
              Yes, retake
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

interface CardProps {
  icon: ComponentType<LucideProps>;
  title: string;
  iconClassName?: string;
  children: ReactNode;
}

function Card({ icon: Icon, title, iconClassName, children }: CardProps) {
  return (
    <div className="space-y-3 border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4 text-accent", iconClassName)} />
        <h3 className="font-display text-base font-semibold text-foreground">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function TagRow({
  tags,
  tone,
}: {
  tags: string[];
  tone: "navy" | "gold" | "green" | "red";
}) {
  const cls = {
    navy: "bg-foreground/5 text-foreground",
    gold: "bg-accent/10 text-accent",
    green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    red: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  }[tone];
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span key={t} className={cn("px-2 py-1 text-xs font-medium", cls)}>
          {t}
        </span>
      ))}
    </div>
  );
}

function SpectrumRow({
  label_left,
  label_right,
  value,
}: {
  label_left: string;
  label_right: string;
  value: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label_left}</span>
        <span>{label_right}</span>
      </div>
      <div className="relative h-1.5 w-full bg-muted">
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
          style={{ left: `${value}%` }}
        />
      </div>
    </div>
  );
}

function SymmetryBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden bg-muted">
        <div
          className="h-full bg-accent transition-transform duration-700 origin-left"
          style={{ transform: `scaleX(${value / 100})` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-semibold text-foreground">
        {value}%
      </span>
    </div>
  );
}

function BurnoutMeter({ pct }: { pct: number }) {
  return (
    <div className="relative h-2 w-full overflow-visible bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-500">
      <div
        className="absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 bg-foreground transition-all duration-500"
        style={{ left: `${pct}%` }}
        aria-label={`Burnout risk ${pct}%`}
      />
    </div>
  );
}

function InsightList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((line) => (
        <li key={line} className="flex gap-2 text-sm text-foreground">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
