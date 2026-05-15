"use server";

import { revalidatePath } from "next/cache";

import { inngest, ResumeUploadedEvent } from "@/inngest/client";
import { createClient } from "@/lib/supabase/server";

// Until `npm run supabase:types` runs against the new migration, the generated
// types don't know about file_hash / is_current. Loose-typed inserts/updates
// for the new columns are isolated to this module.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResumesRow = any;

export type InsertResumeRowResult =
  | { success: true; id: string; deduped?: boolean }
  | {
      success: false;
      kind: "inngest_send_failed";
      resumeId: string;
      error: string;
    }
  | { success: false; kind?: undefined; error: string };

/**
 * Inserts a `resumes` row after a file was uploaded to Storage under the
 * signed-in user's folder (`{userId}/...`). Dedup pre-check on (profile_id,
 * file_hash) short-circuits if the candidate is re-uploading an identical
 * file they already parsed.
 *
 * On success, fires the `resume/uploaded` Inngest event so the background
 * pipeline can take over. A failed event send is surfaced to the caller as
 * `{ kind: "inngest_send_failed", resumeId }` so the UI can offer a retry
 * that doesn't require re-uploading the file.
 */
export async function insertResumeRow(input: {
  storageObjectPath: string;
  fileName: string;
  fileHash: string;
}): Promise<InsertResumeRowResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const prefix = `${user.id}/`;
  if (!input.storageObjectPath.startsWith(prefix)) {
    return { success: false, error: "Invalid storage path." };
  }

  if (!input.fileHash || input.fileHash.length !== 64) {
    return { success: false, error: "Invalid file hash." };
  }

  const { data: publicUrlData } = supabase.storage
    .from("resumes")
    .getPublicUrl(input.storageObjectPath);

  const publicUrl = publicUrlData.publicUrl;

  // Dedup: if this profile already has a completed resume with the same hash,
  // skip the insert entirely and return the existing row.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resumesTable = supabase.from("resumes") as any;
  const { data: byHash } = (await resumesTable
    .select("id")
    .eq("profile_id", user.id)
    .eq("file_hash", input.fileHash)
    .eq("status", "complete")
    .order("parsed_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: { id: string } | null };

  if (byHash) {
    await supabase
      .from("resumes")
      .update({ is_current: true } as ResumesRow)
      .eq("id", byHash.id);
    revalidatePath("/dashboard");
    return { success: true, id: byHash.id, deduped: true };
  }

  // Idempotency for re-clicks on the same uploaded file (same storage URL),
  // even if the prior insert hasn't completed parsing yet.
  const { data: byUrl, error: byUrlError } = await supabase
    .from("resumes")
    .select("id")
    .eq("profile_id", user.id)
    .eq("raw_file_url", publicUrl)
    .maybeSingle();

  if (byUrlError) {
    return { success: false, error: byUrlError.message };
  }

  let resumeId: string;

  if (byUrl) {
    resumeId = byUrl.id;
  } else {
    const { data, error } = await supabase
      .from("resumes")
      .insert({
        profile_id: user.id,
        raw_file_url: publicUrl,
        file_name: input.fileName,
        file_hash: input.fileHash,
      } as ResumesRow)
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    resumeId = data.id;
  }

  try {
    await inngest.send(
      ResumeUploadedEvent.create({ resumeId, profileId: user.id })
    );
  } catch (sendError) {
    return {
      success: false,
      kind: "inngest_send_failed",
      resumeId,
      error:
        sendError instanceof Error
          ? sendError.message
          : "Processing queue unavailable",
    };
  }

  revalidatePath("/dashboard");
  return { success: true, id: resumeId };
}

/**
 * Re-sends the `resume/uploaded` Inngest event for an existing row. Used by
 * the "try again" affordance when `insertResumeRow` returned
 * `inngest_send_failed` (or when a row has been stuck in `uploading` /
 * `failed` longer than the user is willing to wait).
 */
export async function retryParseResume(resumeId: string): Promise<
  { success: true } | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: row, error: rowError } = await supabase
    .from("resumes")
    .select("id, profile_id, status")
    .eq("id", resumeId)
    .maybeSingle();

  if (rowError || !row) {
    return { success: false, error: "Resume not found." };
  }
  if (row.profile_id !== user.id) {
    return { success: false, error: "Not authorized." };
  }
  if (row.status === "complete") {
    return { success: false, error: "Resume already parsed." };
  }

  try {
    await inngest.send(
      ResumeUploadedEvent.create({
        resumeId: row.id,
        profileId: row.profile_id,
      })
    );
  } catch (sendError) {
    return {
      success: false,
      error:
        sendError instanceof Error
          ? sendError.message
          : "Processing queue still unavailable",
    };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
