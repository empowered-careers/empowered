"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { insertResumeRow, retryParseResume } from "@/app/actions/resume";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/dropzone";
import { Button } from "@/components/ui/button";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { sha256Hex } from "@/lib/file-hash";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const RESUME_ALLOWED_MIME = ["application/pdf"] as const;

interface ResumeUploaderProps {
  userId: string;
  onInserted?: () => void;
}

export function ResumeUploader({ userId, onInserted }: ResumeUploaderProps) {
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

  const { files, isSuccess, uploadedObjectPaths, setFiles, open } = upload;

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
      const fileHash = await sha256Hex(file);
      const result = await insertResumeRow({
        storageObjectPath: objectPath,
        fileName: file.name,
        fileHash,
      });

      if (result.success) {
        toast.success(
          result.deduped ? "Resume already on file" : "Resume uploaded",
          {
            description: result.deduped
              ? "Using your previous score."
              : "Parsing in progress…",
          }
        );
        await queryClient.invalidateQueries({
          queryKey: ["dashboard", userId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["resumes", "byUser", userId],
        });
        router.refresh();
        setFiles([]);
        onInserted?.();
      } else if (result.kind === "inngest_send_failed") {
        const stuckResumeId = result.resumeId;
        toast.error("Processing queue temporarily unavailable", {
          description: "Your resume is saved — try again to queue parsing.",
          action: {
            label: "Try again",
            onClick: async () => {
              const retry = await retryParseResume(stuckResumeId);
              if (retry.success) {
                toast.success("Queued — parsing in progress");
              } else {
                toast.error(retry.error);
              }
            },
          },
        });
        await queryClient.invalidateQueries({
          queryKey: ["dashboard", userId],
        });
        router.refresh();
        setFiles([]);
        onInserted?.();
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
        Choose file (PDF)
      </Button>
    </div>
  );
}
