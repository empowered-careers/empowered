"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  type FetchLinkedInUrlResult,
  syncLinkedInProfileUrlFromSession,
} from "@/lib/linkedin-identity-sync";
import { createClient } from "@/lib/supabase/server";

export type { FetchLinkedInUrlResult };

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
  | { success: true }
  | { success: false; error: string };

/**
 * Kicks off the LinkedIn PDF-export sync background job for the signed-in user.
 * Flips `linkedin_profiles.status` → 'processing' and POSTs to /api/sync-linkedin
 * with the storage path of the uploaded LinkedIn "Save to PDF" export.
 * Completion arrives via Realtime → `useLinkedinNotifications`.
 */
export async function triggerLinkedinSync(input: {
  storageObjectPath: string;
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

  const { data: row, error: rowError } = await supabase
    .from("linkedin_profiles")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (rowError) {
    return { success: false, error: rowError.message };
  }
  if (!row) {
    return { success: false, error: "Connect LinkedIn first." };
  }

  await supabase
    .from("linkedin_profiles")
    .update({ status: "processing", sync_started_at: new Date().toISOString() })
    .eq("id", row.id);

  const h = await headers();
  const host = h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? "http";
    const url = `${proto}://${host}/api/sync-linkedin`;
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId: user.id,
        storageObjectPath: input.storageObjectPath,
      }),
      cache: "no-store",
    }).catch(() => {
      // Failure surfaces via the row's status='failed' state.
    });
  }

  revalidatePath("/dashboard");
  return { success: true };
}
