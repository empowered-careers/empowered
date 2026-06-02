import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { Nudge } from "@/lib/dashboard/nudges";

interface NudgesGridProps {
  nudges: Nudge[];
}

export function NudgesGrid({ nudges }: NudgesGridProps) {
  if (nudges.length === 0) return null;

  return (
    <section className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        For your attention
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {nudges.map((nudge) => (
          <article
            key={nudge.id}
            className="flex flex-col gap-3 border border-border border-l-2 border-l-accent bg-card p-5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-accent-foreground/70 dark:text-accent">
              {nudge.tag}
            </p>
            <h3 className="font-display text-base font-medium text-foreground">
              {nudge.title}
            </h3>
            <p className="flex-1 text-sm text-muted-foreground">{nudge.body}</p>
            {nudge.cta && (
              <Button asChild size="sm" className="self-start">
                <Link href={nudge.cta.href}>{nudge.cta.label}</Link>
              </Button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
