"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { retryParseResume } from "@/app/actions/resume";
import { LocalDate } from "@/components/local-date";
import { ResumeUploader } from "@/components/resume/resume-uploader";
import { DimensionList } from "@/components/score/dimension-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type BigWinsResult,
  mergeRoleBullets,
  rolesFromParsed,
} from "@/lib/assessment/big-wins";
import type { ParsedResume, Scoring, SeniorityLevel } from "@/lib/llm/schemas";
import { cn } from "@/lib/utils";
import type { ResumeStatus } from "@/types/db";

export interface ResumeFullRow {
  id: string;
  file_name: string | null;
  raw_file_url: string;
  resume_score: number | null;
  parsed_json: (ParsedResume & { scoring?: Scoring }) | null;
  status: ResumeStatus;
  uploaded_at: string;
  parsed_at: string | null;
  parse_error: string | null;
  is_current: boolean;
  seniority_level: string | null;
  total_years_exp: number | null;
}

interface ResumeClientProps {
  resumes: ResumeFullRow[];
  userId: string;
  /** Big Wins rewrite, overlaid on the parsed roles. Never written into parsed_json. */
  bigWins: BigWinsResult | null;
}

const DIMENSION_LABELS: Record<keyof Scoring["dimensions"], string> = {
  tenure: "Tenure",
  role_progression: "Role progression",
  skill_density: "Skill density",
  impact_signals: "Impact signals",
  formatting: "Formatting",
};

const SENIORITY_LABELS: Record<SeniorityLevel, string> = {
  ic: "IC",
  senior: "Senior",
  staff: "Staff",
  principal: "Principal",
  director: "Director",
  vp: "VP",
  c_level: "C-level",
};

function scoreColorClass(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function StatusBadge({ status }: { status: ResumeStatus }) {
  if (status === "complete") {
    return (
      <Badge
        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        variant="outline"
      >
        Complete
      </Badge>
    );
  }
  if (status === "processing") {
    return (
      <Badge
        className="border-border bg-muted text-muted-foreground"
        variant="outline"
      >
        <Clock className="mr-1 h-3 w-3" />
        Scoring…
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge
        className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
        variant="outline"
      >
        Failed
      </Badge>
    );
  }
  return (
    <Badge
      className="border-border bg-muted text-muted-foreground"
      variant="outline"
    >
      Uploading
    </Badge>
  );
}

export function ResumeClient({ resumes, userId, bigWins }: ResumeClientProps) {
  const [showUploader, setShowUploader] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);

  const current = resumes.find((r) => r.is_current) ?? resumes[0] ?? null;
  const scoring = current?.parsed_json?.scoring ?? null;
  // Bullets shown here are the Big Wins rewrite where one exists, the parser's
  // originals everywhere else. Orphaned overlay roles belong to a superseded
  // resume and are surfaced on /assessments/big-wins, not here.
  const roles = mergeRoleBullets(
    rolesFromParsed(current?.parsed_json?.work_experience ?? []),
    bigWins
  ).filter((r) => !r.orphaned);
  const rewrittenCount = roles.filter((r) => r.rewritten).length;

  if (resumes.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Resume
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your resume to get a Resume score and unlock job matching.
          </p>
        </header>
        <div className="border border-border bg-card p-6">
          <ResumeUploader userId={userId} />
        </div>
      </div>
    );
  }

  // current is guaranteed non-null when resumes.length > 0
  const cur = current as ResumeFullRow;

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Resume
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resume score + breakdown for your current resume.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setShowUploader((s) => !s);
            setUploaderKey((k) => k + 1);
          }}
        >
          {showUploader ? "Cancel" : "Upload new version"}
        </Button>
      </header>

      {showUploader && (
        <div className="border border-border bg-card p-6">
          <ResumeUploader
            key={uploaderKey}
            userId={userId}
            onInserted={() => setShowUploader(false)}
          />
        </div>
      )}

      {/* Hero */}
      <section className="border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {cur.file_name?.trim() || "Untitled resume"}
              </p>
              <p className="text-xs text-muted-foreground">
                Uploaded <LocalDate iso={cur.uploaded_at} />
                {cur.parsed_at && (
                  <>
                    {" · Parsed "}
                    <LocalDate iso={cur.parsed_at} />
                  </>
                )}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={cur.status} />
                {cur.seniority_level && (
                  <Badge
                    variant="outline"
                    className="border-border text-xs text-muted-foreground"
                  >
                    {SENIORITY_LABELS[cur.seniority_level as SeniorityLevel] ??
                      cur.seniority_level}
                  </Badge>
                )}
                {cur.total_years_exp !== null && (
                  <Badge
                    variant="outline"
                    className="border-border text-xs text-muted-foreground"
                  >
                    {cur.total_years_exp} yrs experience
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Resume Score
            </div>
            <div
              className={`font-display text-5xl font-semibold ${
                cur.resume_score === null
                  ? "text-muted-foreground"
                  : scoreColorClass(cur.resume_score)
              }`}
            >
              {cur.resume_score ?? "—"}
            </div>
          </div>
        </div>

        {cur.status === "failed" && (
          <div className="mt-4 flex items-start gap-2 border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Parsing failed</p>
              {cur.parse_error && (
                <p className="mt-1 text-xs opacity-90">{cur.parse_error}</p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 text-xs"
                onClick={async () => {
                  const result = await retryParseResume(cur.id);
                  if (result.success) {
                    toast.success("Queued — parsing in progress");
                  } else {
                    toast.error(result.error);
                  }
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Breakdown */}
      {scoring && (
        <section className="border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
            ATS breakdown
          </h2>
          <DimensionList
            items={(
              Object.keys(DIMENSION_LABELS) as (keyof Scoring["dimensions"])[]
            ).map((k) => ({
              key: k,
              label: DIMENSION_LABELS[k],
              value: scoring.dimensions[k],
            }))}
          />
          {scoring.reasoning && (
            <blockquote className="mt-6 border-l-2 border-primary bg-muted/30 p-4 text-sm italic text-muted-foreground">
              {scoring.reasoning}
            </blockquote>
          )}
        </section>
      )}

      {/* Parsed content */}
      {cur.parsed_json && (
        <section className="border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
            Parsed content
          </h2>

          {cur.parsed_json.skills.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {cur.parsed_json.skills.map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="border-border text-xs"
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {roles.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Work experience
                </h3>
                <Button asChild size="sm" variant="outline">
                  <Link href="/assessments/big-wins">
                    <Trophy className="mr-1.5 h-3.5 w-3.5" />
                    {rewrittenCount === 0
                      ? "Rewrite with Big Wins"
                      : `Big Wins · ${rewrittenCount} of ${roles.length}`}
                  </Link>
                </Button>
              </div>
              <div className="space-y-4">
                {roles.map((role) => (
                  <div
                    key={role.key}
                    className={cn(
                      "border-l-2 pl-4",
                      role.rewritten ? "border-accent" : "border-border"
                    )}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {role.title} · {role.company}
                      </p>
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="h-auto px-2 py-0.5 text-xs"
                      >
                        <Link
                          href={`/assessments/big-wins?role=${encodeURIComponent(role.key)}`}
                        >
                          {role.rewritten ? "Redo" : "Rewrite these bullets"}
                        </Link>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {role.start ?? "?"} — {role.end ?? "present"}
                      {role.rewritten && (
                        <span className="ml-2 text-accent">
                          · Rewritten with Big Wins
                        </span>
                      )}
                    </p>
                    {role.bullets.length > 0 && (
                      <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
                        {role.bullets.map((b, j) => (
                          <li key={j}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {cur.parsed_json.education.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Education
              </h3>
              <div className="space-y-2">
                {cur.parsed_json.education.map((e, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium text-foreground">{e.school}</p>
                    <p className="text-xs text-muted-foreground">
                      {[e.degree, e.field].filter(Boolean).join(", ") || "—"}
                      {e.end && ` · ${e.end}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* History */}
      {resumes.length > 1 && (
        <section className="border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
            Upload history
          </h2>
          <div className="space-y-2">
            {resumes.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {r.file_name?.trim() || "Untitled resume"}
                    {r.is_current && (
                      <span className="ml-2 text-xs text-primary">
                        · current
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded <LocalDate iso={r.uploaded_at} />
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={r.status} />
                  <span
                    className={`font-mono text-sm font-semibold ${
                      r.resume_score === null
                        ? "text-muted-foreground"
                        : scoreColorClass(r.resume_score)
                    }`}
                  >
                    {r.resume_score ?? "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rewrite CTA */}
      <section className="border border-primary/30 bg-primary/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold text-foreground">
              Want Lauren to rewrite this?
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A guided resume review with feedback on positioning, impact
              statements, and ATS keywords.
            </p>
            <Button asChild size="sm" className="mt-3">
              <Link href="/pricing">
                Book a resume review
                <CheckCircle2 className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
