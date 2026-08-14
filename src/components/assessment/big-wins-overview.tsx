"use client";

import { CheckCircle2, Trophy } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { type MergedRole, OPENING_FRAME } from "@/lib/assessment/big-wins";

interface BigWinsOverviewProps {
  roles: MergedRole[];
  onStartRole: (key: string) => void;
  pending: boolean;
}

export function BigWinsOverview({
  roles,
  onStartRole,
  pending,
}: BigWinsOverviewProps) {
  const done = roles.filter((r) => r.rewritten && !r.orphaned).length;
  const live = roles.filter((r) => !r.orphaned);
  const orphaned = roles.filter((r) => r.orphaned);
  const next = live.find((r) => !r.rewritten);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-accent">
          <Trophy className="h-3.5 w-3.5" />
          Big Wins
        </p>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          {done === 0
            ? "Let's rewrite your resume, one role at a time"
            : `${done} of ${live.length} roles rewritten`}
        </h1>
        <p className="text-sm text-muted-foreground">
          {done === 0
            ? OPENING_FRAME
            : "Pick up where you left off, or redo a role you want to sharpen. Your rewritten bullets show on your resume automatically."}
        </p>
      </div>

      <div className="space-y-3">
        {live.map((role) => (
          <article
            key={role.key}
            className="flex flex-col gap-3 border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                {role.rewritten && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                )}
                {role.title} · {role.company}
              </p>
              <p className="text-xs text-muted-foreground">
                {role.start ?? "?"} — {role.end ?? "present"} ·{" "}
                {role.rewritten
                  ? `${role.bullets.length} rewritten bullet${role.bullets.length === 1 ? "" : "s"}`
                  : `${role.originalBullets.length} bullet${role.originalBullets.length === 1 ? "" : "s"} from your resume`}
              </p>
            </div>
            <Button
              size="sm"
              variant={role.rewritten ? "outline" : "default"}
              onClick={() => onStartRole(role.key)}
              disabled={pending}
            >
              {role.rewritten ? "Redo" : "Rewrite"}
            </Button>
          </article>
        ))}
      </div>

      {orphaned.length > 0 && (
        <div className="space-y-2 border border-dashed border-border bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            From a previous resume
          </p>
          <p className="text-xs text-muted-foreground">
            These roles aren&apos;t on your current resume, so they don&apos;t
            show there — but we kept the work.
          </p>
          <ul className="space-y-1 pt-1">
            {orphaned.map((r) => (
              <li key={r.key} className="text-sm text-foreground">
                {r.title} · {r.company}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        {next ? (
          <Button
            size="lg"
            onClick={() => onStartRole(next.key)}
            disabled={pending}
          >
            {done === 0 ? "Start with my most recent role" : "Continue"}
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link href="/resume">See them on my resume</Link>
          </Button>
        )}
        {next && done > 0 && (
          <Button asChild variant="ghost">
            <Link href="/resume">View my resume</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
