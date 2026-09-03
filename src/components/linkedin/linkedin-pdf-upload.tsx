"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  retryLinkedinSync,
  triggerLinkedinSync,
  type TriggerLinkedinSyncResult,
} from "@/app/actions/linkedin";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/dropzone";
import { LinkedInUrlDialog } from "@/components/linkedin/linkedin-url-dialog";
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

  // The upload that couldn't be attached because the profile has no LinkedIn
  // URL yet. Held so the dialog can retry the SAME storage object instead of
  // asking the user to pick the file again — the export is already uploaded.
  const [pendingUpload, setPendingUpload] = useState<{
    storageObjectPath: string;
    fileHash: string;
  } | null>(null);

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

  /**
   * Shared by the initial upload and by the retry that follows the URL dialog,
   * so both paths settle the same way.
   */
  const applySyncResult = useCallback(
    async (
      result: TriggerLinkedinSyncResult,
      pending: { storageObjectPath: string; fileHash: string }
    ) => {
      const settle = async () => {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.byUser(userId),
        });
        router.refresh();
        setFiles([]);
        onTriggered?.();
      };

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
        await settle();
        return;
      }

      if (result.kind === "inngest_send_failed") {
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
        await settle();
        return;
      }

      if (result.kind === "missing_linkedin_url") {
        // Don't toast-and-drop: the PDF is already in storage, so ask for the
        // one missing input and finish the job rather than losing the upload.
        setPendingUpload(pending);
        triggerLockRef.current = false;
        return;
      }

      toast.error(result.error);
      triggerLockRef.current = false;
    },
    [onTriggered, queryClient, router, setFiles, userId]
  );

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
      const pending = {
        storageObjectPath: objectPath,
        fileHash: await sha256Hex(file),
      };
      await applySyncResult(await triggerLinkedinSync(pending), pending);
    })();
  }, [applySyncResult, files, isSuccess, uploadedObjectPaths]);

  return (
    <div className="space-y-3">
      <LinkedInUrlDialog
        description={
          <>
            Your export is uploaded — we just need your profile URL to attach it
            and start scoring.
          </>
        }
        onOpenChange={(next) => {
          if (!next) {
            // Dismissed without saving: the object stays in storage but nothing
            // references it, so say so rather than implying it worked.
            setPendingUpload(null);
            toast.error("Add your LinkedIn URL to finish this upload.");
          }
        }}
        onSaved={() => {
          const pending = pendingUpload;
          setPendingUpload(null);
          if (!pending) return;
          void (async () => {
            await applySyncResult(await triggerLinkedinSync(pending), pending);
          })();
        }}
        open={pendingUpload !== null}
        submitLabel="Save and score"
        title="One more thing"
      />
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
