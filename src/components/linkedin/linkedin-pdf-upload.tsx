"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { retryLinkedinSync, triggerLinkedinSync } from "@/app/actions/linkedin";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/dropzone";
import { Button } from "@/components/ui/button";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { sha256Hex } from "@/lib/file-hash";
import { queryKeys } from "@/lib/query-keys";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["application/pdf"] as const;

interface LinkedInPdfUploadProps {
  userId: string;
  onTriggered?: () => void;
}

export function LinkedInPdfUpload({
  userId,
  onTriggered,
}: LinkedInPdfUploadProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const triggerLockRef = useRef(false);

  const upload = useSupabaseUpload({
    bucketName: "linkedin-exports",
    path: userId,
    maxFiles: 1,
    maxFileSize: MAX_BYTES,
    allowedMimeTypes: [...ALLOWED_MIME],
    upsert: false,
    resolveStorageKey: (file) => `${crypto.randomUUID()}-${file.name}`,
  });

  const { files, isSuccess, uploadedObjectPaths, setFiles, open } = upload;

  useEffect(() => {
    if (!isSuccess || files.length === 0) {
      triggerLockRef.current = false;
      return;
    }

    const file = files[0];
    const objectPath = uploadedObjectPaths[file.name];
    if (!objectPath || triggerLockRef.current) return;
    triggerLockRef.current = true;

    void (async () => {
      const fileHash = await sha256Hex(file);
      const result = await triggerLinkedinSync({
        storageObjectPath: objectPath,
        fileHash,
      });

      if (result.success) {
        toast.success(
          result.deduped
            ? "LinkedIn export already on file"
            : "LinkedIn export uploaded",
          {
            description: result.deduped
              ? "Using your previous score."
              : "Parsing in progress…",
          }
        );
        await queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.byUser(userId),
        });
        router.refresh();
        setFiles([]);
        onTriggered?.();
      } else if (result.kind === "inngest_send_failed") {
        const stuckId = result.linkedinProfileId;
        toast.error("Processing queue temporarily unavailable", {
          description: "Your export is saved — try again to queue parsing.",
          action: {
            label: "Try again",
            onClick: async () => {
              const retry = await retryLinkedinSync(stuckId);
              if (retry.success) {
                toast.success("Queued — parsing in progress");
              } else {
                toast.error(retry.error);
              }
            },
          },
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.byUser(userId),
        });
        router.refresh();
        setFiles([]);
        onTriggered?.();
      } else {
        toast.error(result.error);
        triggerLockRef.current = false;
      }
    })();
  }, [
    files,
    isSuccess,
    onTriggered,
    queryClient,
    router,
    setFiles,
    uploadedObjectPaths,
    userId,
  ]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        On LinkedIn: open your profile → <strong>More</strong> →{" "}
        <strong>Save to PDF</strong>, then upload here.
      </p>
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
        Choose LinkedIn PDF export
      </Button>
    </div>
  );
}
