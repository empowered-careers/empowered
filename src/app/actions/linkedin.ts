"use server";

import { revalidatePath } from "next/cache";

import { inngest, LinkedinUploadedEvent } from "@/inngest/client";
import {
  type FetchLinkedInUrlResult,
  syncLinkedInProfileUrlFromSession,
} from "@/lib/linkedin-identity-sync";
import { createClient } from "@/lib/supabase/server";

export type { FetchLinkedInUrlResult };

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Uses the current Supabase session's LinkedIn `provider_token` to call
 * `/rest/identityMe` + `/v2/me`, persisting `profiles.linkedin_url` and a
 * `linkedin_profiles` row (URL + headline + raw_json). Errors are returned,
 * not thrown — safe for post-OAuth flows.
 */
export async function fetchAndStoreLinkedInUrl(): Promise<FetchLinkedInUrlResult> {
  const supabase = await createClient();
  return syncLinkedInProfileUrlFromSession(supabase);
}

export type TriggerLinkedinSyncResult =
  | { success: true; deduped?: boolean }
  | {
      success: false;
      kind: "inngest_send_failed";
      linkedinProfileId: string;
      error: string;
    }
  | { success: false; kind?: undefined; error: string };

/**
 * Kicks off the LinkedIn PDF-export parse pipeline (Inngest → Claude Haiku
 * parse → Claude Sonnet score). Idempotent on (profile_id, file_hash):
 * re-uploading the same PDF returns `{ success: true, deduped: true }` and
 * does not re-run the pipeline.
 *
 * Completion arrives via Realtime → `useLinkedinNotifications`.
 */
export async function triggerLinkedinSync(input: {
  storageObjectPath: string;
  fileHash: string;
}): Promise<TriggerLinkedinSyncResult> {
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

  const row = await ensureLinkedinProfileRow(supabase, user.id);
  if (!row) {
    return { success: false, error: "Add your LinkedIn URL first." };
  }

  // Action-level dedup: same file hash already fully parsed → skip.
  if (row.file_hash === input.fileHash && row.status === "complete") {
    revalidatePath("/dashboard");
    return { success: true, deduped: true };
  }

  // Stamp hash + storage path on the row. The path persists so
  // retryLinkedinSync(linkedinProfileId) can re-fetch the file without
  // requiring the user to re-upload.
  const { error: updateError } = await supabase
    .from("linkedin_profiles")
    .update({
      file_hash: input.fileHash,
      last_export_path: input.storageObjectPath,
      status: "processing",
      sync_started_at: new Date().toISOString(),
      sync_error: null,
    })
    .eq("id", row.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  try {
    await inngest.send(
      LinkedinUploadedEvent.create({
        linkedinProfileId: row.id,
        profileId: user.id,
        storageObjectPath: input.storageObjectPath,
      })
    );
  } catch (sendError) {
    return {
      success: false,
      kind: "inngest_send_failed",
      linkedinProfileId: row.id,
      error:
        sendError instanceof Error
          ? sendError.message
          : "Processing queue unavailable",
    };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Re-fires the `linkedin/uploaded` Inngest event for an existing row. Used by
 * the "Try again" affordance when `triggerLinkedinSync` returned
 * `inngest_send_failed`, or when a row has been stuck in `processing` /
 * `failed`. Re-reads `last_export_path` from the row — never re-uploads.
 */
export async function retryLinkedinSync(linkedinProfileId: string): Promise<
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
    .from("linkedin_profiles")
    .select("id, profile_id, status, last_export_path")
    .eq("id", linkedinProfileId)
    .maybeSingle();

  if (rowError || !row) {
    return { success: false, error: "LinkedIn profile not found." };
  }
  if (row.profile_id !== user.id) {
    return { success: false, error: "Not authorized." };
  }
  if (row.status === "complete") {
    return { success: false, error: "LinkedIn already parsed." };
  }
  if (!row.last_export_path) {
    return {
      success: false,
      error: "No prior upload on file — please upload your PDF.",
    };
  }

  try {
    await inngest.send(
      LinkedinUploadedEvent.create({
        linkedinProfileId: row.id,
        profileId: row.profile_id,
        storageObjectPath: row.last_export_path,
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

/**
 * Returns the existing linkedin_profiles row for this user, or upserts one
 * seeded from `profiles.linkedin_url` if the user added their URL via the
 * dialog without going through LinkedIn OAuth. `onConflict: profile_id`
 * guards against a race with the OAuth sync writing in parallel.
 *
 * Returns null if the user has no linkedin_url anywhere — caller surfaces
 * "Add your LinkedIn URL first."
 */
async function ensureLinkedinProfileRow(
  supabase: ServerSupabase,
  userId: string
): Promise<{
  id: string;
  file_hash: string | null;
  status: string | null;
  linkedin_url: string;
} | null> {
  const { data: existing } = await supabase
    .from("linkedin_profiles")
    .select("id, file_hash, status, linkedin_url")
    .eq("profile_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data: profile } = await supabase
    .from("profiles")
    .select("linkedin_url")
    .eq("id", userId)
    .single();

  if (!profile?.linkedin_url) return null;

  const { data: created, error: insertError } = await supabase
    .from("linkedin_profiles")
    .upsert(
      {
        profile_id: userId,
        linkedin_url: profile.linkedin_url,
        status: "idle",
      },
      { onConflict: "profile_id" }
    )
    .select("id, file_hash, status, linkedin_url")
    .single();

  if (insertError || !created) return null;
  return created;
}
