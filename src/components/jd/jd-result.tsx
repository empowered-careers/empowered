"use client";

import { ArrowLeft, Check, Loader2, Minus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { retryJd } from "@/app/actions/jd";
import { Button } from "@/components/ui/button";
import type { JdMatch } from "@/lib/llm/schemas";
import { cn } from "@/lib/utils";

const GAP_ICON = {
  met: Check,
  partial: Minus,
  missing: X,
} as const;

const GAP_TONE = {
  met: "text-chart-2",
  partial: "text-accent",
  missing: "text-destructive",
} as const;

function scoreTone(score: number): string {
  if (score >= 80) return "text-chart-2";
  if (score >= 60) return "text-accent";
  return "text-destructive";
}

interface Props {
  jdId: string;
  status: string;
  atsScore: number | null;
  gapSummary: string | null;
  match: JdMatch | null;
  parseError: string | null;
}

export function JdResult({
  jdId,
  status,
  atsScore,
  gapSummary,
  match,
  parseError,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleRetry() {
    startTransition(async () => {
      const result = await retryJd(jdId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Scoring again…");
      router.refresh();
    });
  }

  const back = (
    <Button asChild className="mb-4 -ml-2" size="sm" variant="ghost">
      <Link href="/jd-match">
        <ArrowLeft className="mr-1.5 size-3.5" />
        JD Match
      </Link>
    </Button>
  );

  if (status === "failed") {
    return (
      <div className="mx-auto max-w-3xl">
        {back}
        <div className="border border-border bg-card px-6 py-10 text-center">
          <h1 className="font-medium text-lg">Scoring failed</h1>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm">
            {parseError === "inngest_send_failed"
              ? "The job never started. Your JD is saved — retrying is free."
              : "Something went wrong reading that posting. Your JD is saved — retrying is free."}
          </p>
          <Button
            className="mt-6"
            disabled={pending}
            onClick={handleRetry}
            size="sm"
          >
            {pending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (status !== "complete" || atsScore === null) {
    return (
      <div className="mx-auto max-w-3xl">
        {back}
        <div className="border border-border bg-card px-6 py-14 text-center">
          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground text-sm">
            Reading the posting and comparing it to your resume. You can leave
            this page — we&apos;ll notify you.
          </p>
        </div>
      </div>
    );
  }

  const req = match?.requirements;

  return (
    <div className="mx-auto max-w-3xl">
      {back}

      <div className="border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="font-display font-medium text-2xl tracking-tight">
              {req?.title ?? "This role"}
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              {[req?.company, req?.seniority, req?.location]
                .filter(Boolean)
                .join(" · ") || "Pasted job description"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className={cn(
                "font-display font-bold text-5xl leading-none",
                scoreTone(atsScore)
              )}
            >
              {atsScore}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground uppercase tracking-[0.08em]">
              ATS match
            </p>
          </div>
        </div>

        {gapSummary && (
          <p className="mt-5 border-t border-border pt-5 text-[14.5px] text-foreground leading-relaxed">
            {gapSummary}
          </p>
        )}
      </div>

      {match && match.gaps.length > 0 && (
        <div className="mt-6 border border-border bg-card">
          <h2 className="border-border border-b px-4 py-2.5 font-medium text-[13px]">
            Requirement by requirement
          </h2>
          <ul>
            {match.gaps.map((gap, i) => {
              const Icon = GAP_ICON[gap.status];
              return (
                <li
                  className="flex gap-3 border-border border-b px-4 py-3 last:border-b-0"
                  key={`${gap.requirement}-${i}`}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      GAP_TONE[gap.status]
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-[13.5px] text-foreground">
                      {gap.requirement}
                    </p>
                    {gap.note && (
                      <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                        {gap.note}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {req && req.keywords.length > 0 && (
        <div className="mt-6 border border-border bg-card p-5">
          <h2 className="font-medium text-[13px]">Keywords from the posting</h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Terms an ATS will look for. Worth mirroring where they&apos;re
            genuinely true of your experience.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {req.keywords.map((kw) => (
              <span
                className="border border-border px-2 py-0.5 text-[12px] text-foreground/80"
                key={kw}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Gap → product. §6's prescription engine will pick the specific SKU from
          the candidate's scores; for now the catalog is one click away. */}
      <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
        <Button asChild size="sm">
          <Link href="/assessments/big-wins">Strengthen my resume bullets</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/pricing">Close the gap with a coach</Link>
        </Button>
      </div>
    </div>
  );
}
