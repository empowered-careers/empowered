"use client";

import { Building2, Compass, Target, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";

interface RoleClarityWelcomeProps {
  onStart: () => void;
}

const FEATURES = [
  {
    icon: Target,
    title: "Title & Positioning",
    body: "Whether the title on your resume matches the seniority and scope you actually carried.",
  },
  {
    icon: Compass,
    title: "Scope & Impact",
    body: "How much of your work you can quantify, and how much authority you really held.",
  },
  {
    icon: Building2,
    title: "Company & Industry Fit",
    body: "The size, stage, and industries where your strengths have actually landed.",
  },
  {
    icon: TrendingUp,
    title: "Market Direction",
    body: "Whether you're aiming at where the market is now, or where it's heading.",
  },
];

export function RoleClarityWelcome({ onStart }: RoleClarityWelcomeProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
          Role Clarity Assessment
        </p>
        <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Which role should you actually be targeting?
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
          18 quick questions — about 5 minutes. This looks at what you&apos;ve
          actually done, not just your title, and tells you where your search is
          clear and where it&apos;s still fuzzy.
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
          Start Role Clarity
        </Button>
      </div>
    </div>
  );
}
