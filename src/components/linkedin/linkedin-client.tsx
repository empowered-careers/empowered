"use client";

import { AlertCircle, Clock, Linkedin, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { retryLinkedinSync } from "@/app/actions/linkedin";
import { scoreToLetterGrade } from "@/components/linkedin/grade";
import { LinkedInPdfUpload } from "@/components/linkedin/linkedin-pdf-upload";
import { DimensionList } from "@/components/score/dimension-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  LinkedInScoring,
  ParsedLinkedIn,
} from "@/lib/llm/schemas";
import type { Database } from "@/types/database.types";

type LinkedinStatus = Database["public"]["Enums"]["linkedin_sync_status"];

export interface LinkedinFullRow {
  id: string;
  linkedin_url: string;
  headline: string | null;
  summary: string | null;
  profile_score: number | null;
  parsed_json: (ParsedLinkedIn & { scoring?: LinkedInScoring }) | null;
  status: LinkedinStatus;
  last_export_path: string | null;
  sync_started_at: string | null;
  synced_at: string | null;
  sync_error: string | null;
}

interface LinkedinClientProps {
  linkedin: LinkedinFullRow | null;
  profileLinkedinUrl: string | null;
  userId: string;
}

const DIMENSION_LABELS: Record<keyof LinkedInScoring["dimensions"], string> = {
  headline_quality: "Headline quality",
  about_quality: "About quality",
  experience_depth: "Experience depth",
  skill_density: "Skill density",
  profile_completeness: "Profile completeness",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scoreColorClass(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function EmptyState({ userId, linkedinUrl }: { userId: string; linkedinUrl: string | null }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          LinkedIn Grade
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your LinkedIn PDF export to get a profile score and optimization tips.
        </p>
      </header>
      {linkedinUrl && (
        <div className="border border-border bg-card p-4 text-sm">
          <span className="text-muted-foreground">Connected profile: </span>
          <a
            className="text-primary hover:underline"
            href={linkedinUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {linkedinUrl}
          </a>
        </div>
      )}
      <div className="border border-border bg-card p-6">
        <LinkedInPdfUpload userId={userId} />
      </div>
    </div>
  );
}

export function LinkedinClient({
  linkedin,
  profileLinkedinUrl,
  userId,
}: LinkedinClientProps) {
  const [showUploader, setShowUploader] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);

  const isEmpty =
    !linkedin ||
    (linkedin.status === "idle" && !linkedin.parsed_json && linkedin.profile_score === null);

  if (isEmpty) {
    return <EmptyState userId={userId} linkedinUrl={profileLinkedinUrl} />;
  }

  const row = linkedin as LinkedinFullRow;
  const scoring = row.parsed_json?.scoring ?? null;
  const parsed = row.parsed_json ?? null;
  const grade = scoreToLetterGrade(row.profile_score);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            LinkedIn Grade
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How your profile reads to recruiters and search.
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
          {showUploader ? "Cancel" : "Upload new PDF export"}
        </Button>
      </header>

      {showUploader && (
        <div className="border border-border bg-card p-6">
          <LinkedInPdfUpload
            key={uploaderKey}
            userId={userId}
            onTriggered={() => setShowUploader(false)}
          />
        </div>
      )}

      {/* Hero */}
      <section className="border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-muted">
              <Linkedin className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              {row.headline && (
                <p className="text-sm font-medium text-foreground">{row.headline}</p>
              )}
              <a
                className="block truncate text-xs text-primary hover:underline"
                href={row.linkedin_url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {row.linkedin_url}
              </a>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {row.status === "processing" && (
                  <Badge className="border-border bg-muted text-muted-foreground" variant="outline">
                    <Clock className="mr-1 h-3 w-3" />
                    Scoring…
                  </Badge>
                )}
                {row.status === "complete" && row.synced_at && (
                  <span className="text-xs text-muted-foreground">
                    Last synced {formatDate(row.synced_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Grade
            </div>
            <div
              className={`font-display text-5xl font-semibold ${
                row.profile_score === null
                  ? "text-muted-foreground"
                  : scoreColorClass(row.profile_score)
              }`}
            >
              {grade}
            </div>
            {row.profile_score !== null && (
              <div className="font-mono text-xs text-muted-foreground">
                {row.profile_score} / 100
              </div>
            )}
          </div>
        </div>

        {row.status === "failed" && (
          <div className="mt-4 flex items-start gap-2 border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Sync failed</p>
              {row.sync_error && (
                <p className="mt-1 text-xs opacity-90">{row.sync_error}</p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 text-xs"
                onClick={async () => {
                  const result = await retryLinkedinSync(row.id);
                  if (result.success) {
                    toast.success("Queued — parsing in progress");
                  } else {
                    toast.error(result.error);
                  }
                }}
              >
                Retry sync
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Breakdown */}
      {scoring && (
        <section className="border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
            Grade breakdown
          </h2>
          <DimensionList
            items={(
              Object.keys(DIMENSION_LABELS) as (keyof LinkedInScoring["dimensions"])[]
            ).map((k) => ({
              key: k,
              label: DIMENSION_LABELS[k],
              value: scoring.dimensions[k],
            }))}
          />
        </section>
      )}

      {/* Tips + paid CTA */}
      {scoring?.reasoning && (
        <section className="border border-border bg-card p-6">
          <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
            Optimization tips
          </h2>
          <blockquote className="border-l-2 border-primary bg-muted/30 p-4 text-sm italic text-muted-foreground">
            {scoring.reasoning}
          </blockquote>
          <div className="mt-4 flex items-start gap-4 border border-primary/30 bg-primary/5 p-4">
            <div className="flex h-9 w-9 items-center justify-center bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">
                Get a full LinkedIn audit with Lauren
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                A line-by-line rewrite focused on recruiter search and clarity.
              </p>
              {/* TODO(coaching): wire to coaching booking flow once available */}
              <Button asChild size="sm" className="mt-3 h-7 text-xs">
                <a href="#" aria-disabled>
                  Book a LinkedIn audit
                </a>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Parsed preview */}
      {parsed && (
        <section className="border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
            Profile preview
          </h2>

          {parsed.about && (
            <div className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                About
              </h3>
              <p className="whitespace-pre-line text-sm text-foreground">
                {parsed.about}
              </p>
            </div>
          )}

          {parsed.experience.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Experience
              </h3>
              <div className="space-y-4">
                {parsed.experience.map((e, i) => (
                  <div key={i} className="border-l-2 border-border pl-4">
                    <p className="text-sm font-medium text-foreground">
                      {e.title} · {e.company}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.start ?? "?"} — {e.end ?? "present"}
                      {e.location && ` · ${e.location}`}
                    </p>
                    {e.bullets.length > 0 && (
                      <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
                        {e.bullets.map((b, j) => (
                          <li key={j}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsed.skills.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {parsed.skills.map((s) => (
                  <Badge key={s} variant="outline" className="border-border text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {parsed.certifications.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Certifications
              </h3>
              <div className="space-y-1.5">
                {parsed.certifications.map((c, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-foreground">{c.name}</span>
                    {c.issuer && (
                      <span className="text-muted-foreground"> · {c.issuer}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
