"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MergedRole } from "@/lib/assessment/big-wins";

interface BigWinsRecapProps {
  role: MergedRole;
  bullets: string[];
  /** Bullets from the resume before the rewrite. May be empty. */
  originalBullets: string[];
  onSaveEdits: (bullets: string[]) => void;
  onMoreQuestions: () => void;
  hasMoreQuestions: boolean;
  onDone: () => void;
  doneLabel: string;
  pending: boolean;
}

export function BigWinsRecap({
  role,
  bullets,
  originalBullets,
  onSaveEdits,
  onMoreQuestions,
  hasMoreQuestions,
  onDone,
  doneLabel,
  pending,
}: BigWinsRecapProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bullets.join("\n"));

  const save = () => {
    onSaveEdits(draft.split("\n"));
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-accent">
          {role.title} · {role.company}
        </p>
        <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">
          Here&apos;s what we pulled out — anything missing?
        </h2>
      </div>

      {bullets.length === 0 ? (
        <p className="border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          Nothing to write up yet — every question for this role was skipped or
          empty. Your resume bullets are unchanged.
        </p>
      ) : editing ? (
        <div className="space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(6, bullets.length + 2)}
            aria-label="Edit your bullets, one per line"
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            One bullet per line. Clearing this reverts the role to the bullets
            already on your resume.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={pending}>
              Save edits
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(bullets.join("\n"));
                setEditing(false);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border-l-2 border-accent bg-accent/5 py-3 pl-4 pr-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Rewritten
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-foreground">
              {bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>

          {originalBullets.length > 0 && (
            <details className="border border-border bg-card px-4 py-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                What was on your resume before
              </summary>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
                {originalBullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </details>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(true)}
            disabled={pending}
          >
            Edit these
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button onClick={onDone} disabled={pending}>
          {doneLabel}
        </Button>
        {hasMoreQuestions && (
          <Button
            variant="outline"
            onClick={onMoreQuestions}
            disabled={pending}
          >
            Answer more questions for this role
          </Button>
        )}
      </div>
    </div>
  );
}
