"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { insertResumeRow } from "@/app/actions/resume";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import type { DashboardResume } from "@/hooks/use-dashboard-data";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
/** PDF, .docx, and .doc — matches `storage.buckets.allowed_mime_types` for `resumes`. */
const RESUME_ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
] as const;

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

function ResumeUploadDropzone({
  userId,
  onInserted,
}: {
  userId: string;
  onInserted: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insertLockRef = useRef(false);

  const upload = useSupabaseUpload({
    bucketName: "resumes",
    path: userId,
    maxFiles: 1,
    maxFileSize: MAX_RESUME_BYTES,
    allowedMimeTypes: [...RESUME_ALLOWED_MIME],
    upsert: false,
    resolveStorageKey: (file) => `${crypto.randomUUID()}-${file.name}`,
  });

  const {
    files,
    isSuccess,
    uploadedObjectPaths,
    setFiles,
    open,
  } = upload;

  useEffect(() => {
    if (!isSuccess || files.length === 0) {
      insertLockRef.current = false;
      return;
    }

    const file = files[0];
    const objectPath = uploadedObjectPaths[file.name];
    if (!objectPath || insertLockRef.current) {
      return;
    }
    insertLockRef.current = true;

    void (async () => {
      const result = await insertResumeRow({
        storageObjectPath: objectPath,
        fileName: file.name,
      });

      if (result.success) {
        toast.success("Resume uploaded");
        await queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
        router.refresh();
        setFiles([]);
        onInserted();
      } else {
        toast.error(result.error);
        insertLockRef.current = false;
      }
    })();
  }, [
    files,
    isSuccess,
    onInserted,
    queryClient,
    router,
    setFiles,
    uploadedObjectPaths,
    userId,
  ]);

  return (
    <div className="space-y-3">
      <Dropzone
        {...upload}
        className="rounded-none border border-dashed border-border bg-muted/20 p-4 text-center transition-colors duration-200"
      >
        <DropzoneEmptyState className="py-1" />
        <DropzoneContent className="[&_button]:h-8 [&_button]:gap-1.5 [&_button]:text-xs" />
      </Dropzone>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-full gap-2 text-xs"
        onClick={() => open()}
      >
        <Upload className="h-3.5 w-3.5" />
        Choose file (PDF, DOC, DOCX)
      </Button>
    </div>
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
            <ResumeUploadDropzone
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
              <ResumeUploadDropzone
                key={dropzoneKey}
                userId={userId}
                onInserted={handleInserted}
              />
            )}

            <div className="flex gap-2 pt-1">
              <Button
                id="resume-ats-score-btn"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 flex-1 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Get ATS Score
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
