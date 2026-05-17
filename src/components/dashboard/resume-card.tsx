"use client";

import {
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { ResumeUploader } from "@/components/resume/resume-uploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardResume } from "@/hooks/use-dashboard-data";

interface ResumeCardProps {
  resumes: DashboardResume[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function AtsScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <Badge
        className="border-border bg-muted text-xs text-muted-foreground"
        variant="outline"
      >
        <Clock className="mr-1 h-3 w-3" />
        Scoring…
      </Badge>
    );
  }

  const color =
    score >= 80
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : score >= 60
        ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
        : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400";

  return (
    <Badge className={`border text-xs font-semibold ${color}`} variant="outline">
      ATS {score}
    </Badge>
  );
}

export function ResumeCard({ resumes }: ResumeCardProps) {
  const { user } = useAuth();
  const hasResumes = resumes.length > 0;
  const [showDropzone, setShowDropzone] = useState(false);
  const [dropzoneKey, setDropzoneKey] = useState(0);

  const userId = user?.id;

  const bumpDropzone = useCallback(() => {
    setDropzoneKey((k) => k + 1);
  }, []);

  const handleInserted = useCallback(() => {
    setShowDropzone(false);
    bumpDropzone();
  }, [bumpDropzone]);

  if (!userId) {
    return (
      <div
        id="resume-hub"
        className="flex flex-col border border-border bg-card"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Resume Hub
            </h2>
          </div>
        </div>
        <div className="p-5 text-sm text-muted-foreground">Sign in to upload a resume.</div>
      </div>
    );
  }

  return (
    <div
      id="resume-hub"
      className="flex flex-col border border-border bg-card"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold text-foreground">
            Resume Hub
          </h2>
        </div>
        {hasResumes && (
          <div className="flex items-center gap-1">
            {showDropzone && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Close upload"
                onClick={() => {
                  setShowDropzone(false);
                  bumpDropzone();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              id="resume-upload-btn"
              onClick={() => {
                setShowDropzone((was) => {
                  if (!was) bumpDropzone();
                  return true;
                });
              }}
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
            >
              <Upload className="h-3.5 w-3.5" />
              New
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {!hasResumes ? (
          <div className="flex flex-1 flex-col py-4 text-center">
            <p className="mb-1 font-semibold text-foreground">No resume yet</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Upload your resume to get an ATS score and unlock job matching
            </p>
            <ResumeUploader
              key={dropzoneKey}
              userId={userId}
              onInserted={handleInserted}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {resumes.map((resume, i) => (
              <div
                key={resume.id}
                id={`resume-item-${resume.id}`}
                className="group flex items-center justify-between border border-border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-medium text-foreground">
                      {resume.file_name?.trim() || `Resume ${resumes.length - i}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {formatDate(resume.uploaded_at)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <AtsScoreBadge score={resume.ats_score} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>
            ))}

            {showDropzone && (
              <ResumeUploader
                key={dropzoneKey}
                userId={userId}
                onInserted={handleInserted}
              />
            )}

            <div className="flex gap-2 pt-1">
              <Button
                id="resume-ats-score-btn"
                asChild
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 flex-1 text-xs"
              >
                <Link href="/resume">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  View details
                </Link>
              </Button>
              <Button
                id="resume-optimize-btn"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 flex-1 text-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Optimize
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
