"use client";

import { Compass, Lightbulb, Sparkles, Target } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BlueprintWelcomeProps {
  onStart: () => void;
}

const FEATURES = [
  {
    icon: Sparkles,
    title: "Career Archetype",
    body: "Discover the identity that drives how you lead, decide, and create impact.",
  },
  {
    icon: Compass,
    title: "Leadership & Energy Audit",
    body: "Surface the work that energises you and the patterns that drain you.",
  },
  {
    icon: Target,
    title: "Company Culture Fit",
    body: "See the company stage and culture where your strengths compound.",
  },
  {
    icon: Lightbulb,
    title: "Communication Style",
    body: "Get tailored interview, strategy, and LinkedIn moves for your voice.",
  },
];

export function BlueprintWelcome({ onStart }: BlueprintWelcomeProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
          Career Identity Blueprint™
        </p>
        <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
          The 30-question scan that reveals how you actually work
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
          A psychometric snapshot of your archetype, leadership style, and the
          environments where your best work lives. Takes 5–7 minutes. Your
          results power matching, resume voice, and your dashboard nudges.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="flex gap-3 border border-border bg-card p-4"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="text-xs text-muted-foreground">{f.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button onClick={onStart} size="lg">
          Begin Your Blueprint
        </Button>
      </div>
    </div>
  );
}
