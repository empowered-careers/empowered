"use client";

import { Loader2 } from "lucide-react";

const STEPS = [
  "Mapping your personality dimensions…",
  "Identifying leadership archetype…",
  "Calculating career symmetry scores…",
  "Generating energy audit analysis…",
  "Personalising your career blueprint…",
];

export function BlueprintLoading() {
  return (
    <div className="space-y-6 py-12 text-center">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-accent" />
      <h2 className="font-display text-2xl font-semibold text-foreground">
        Building your Blueprint
      </h2>
      <ul className="mx-auto max-w-md space-y-2 text-left text-sm text-muted-foreground">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className="opacity-0 animate-in fade-in slide-in-from-bottom-1"
            style={{
              animationDelay: `${i * 360}ms`,
              animationFillMode: "forwards",
              animationDuration: "400ms",
            }}
          >
            • {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
