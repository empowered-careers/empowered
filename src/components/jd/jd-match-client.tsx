"use client";

import { Loader2, ScanSearch } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { submitJd } from "@/app/actions/jd";
import { LocalDate } from "@/components/local-date";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { JdListFields } from "@/types/db";

/**
 * Paste a job description, get an ATS score plus a gap summary. Scoring runs in
 * Inngest, so the row lands as `processing` and `useJdNotifications` toasts when
 * it flips — the candidate can navigate away.
 */

interface Quota {
  used: number;
  /** null when unlimited. */
  remaining: number | null;
  unlimited: boolean;
  exhausted: boolean;
}

function scoreTone(score: number): string {
  if (score >= 80) return "text-chart-2";
  if (score >= 60) return "text-accent";
  return "text-destructive";
}

export function JdMatchClient({
  jds,
  quota,
  hasResume,
}: {
  jds: JdListFields[];
  quota: Quota;
  hasResume: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitJd(text);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setText("");
      toast.success("Scoring your match — we'll ping you when it's ready.");
      router.refresh();
    });
  }

  const blocked = !hasResume || quota.exhausted;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-medium text-3xl tracking-tight">
          JD Match
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Paste a job description. We&apos;ll score your current resume against
          it and tell you what&apos;s missing.
        </p>
      </div>

      {!hasResume ? (
        <div className="border border-border bg-card px-6 py-10 text-center">
          <ScanSearch className="mx-auto size-6 text-muted-foreground" />
          <h2 className="mt-4 font-medium text-lg">Score your resume first</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm">
            The match is your resume versus the posting — without a parsed
            resume there&apos;s nothing to compare.
          </p>
          <Button asChild className="mt-6" size="sm">
            <Link href="/resume">Go to Resume</Link>
          </Button>
        </div>
      ) : (
        <div className="border border-border bg-card p-5">
          <Textarea
            className="min-h-[220px]"
            disabled={pending || quota.exhausted}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the full job description — responsibilities, requirements, the lot."
            value={text}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12.5px] text-muted-foreground">
              {quota.unlimited
                ? "Unlimited checks — thanks for being a client."
                : quota.exhausted
                  ? "You've used all 5 free checks this month."
                  : `${quota.remaining} of 5 free checks left this month.`}
            </p>
            <div className="flex gap-2">
              {quota.exhausted && (
                <Button asChild size="sm" variant="outline">
                  <Link href="/pricing">Get unlimited</Link>
                </Button>
              )}
              <Button
                disabled={blocked || pending || text.trim().length === 0}
                onClick={handleSubmit}
                size="sm"
              >
                {pending && (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                )}
                Score this JD
              </Button>
            </div>
          </div>
        </div>
      )}

      {jds.length > 0 && (
        <div className="mt-9">
          <h2 className="mb-3 font-display font-medium text-xl">Your checks</h2>
          <div className="overflow-hidden border border-border bg-card">
            {jds.map((jd) => (
              <Link
                className="flex items-start gap-4 border-border border-b px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/40"
                href={`/jd-match/${jd.id}`}
                key={jd.id}
              >
                <div className="w-12 shrink-0 text-center">
                  {jd.status === "complete" && jd.ats_score !== null ? (
                    <span
                      className={cn(
                        "font-display font-bold text-xl",
                        scoreTone(jd.ats_score)
                      )}
                    >
                      {jd.ats_score}
                    </span>
                  ) : jd.status === "failed" ? (
                    <span className="text-[11px] text-destructive uppercase">
                      Failed
                    </span>
                  ) : (
                    <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] text-foreground">
                    {jd.gap_summary ??
                      (jd.status === "failed"
                        ? "Scoring failed — open to retry."
                        : "Scoring…")}
                  </p>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    <LocalDate format="compact" iso={jd.created_at} />
                    {jd.source === "paid" && " · unlimited"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
