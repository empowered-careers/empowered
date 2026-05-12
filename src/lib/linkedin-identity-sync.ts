import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { normalizeLinkedInProfileUrl } from "@/lib/linkedin-url";
import type { Database } from "@/types/supabase";

/** LinkedIn REST API version header (see LinkedIn developer docs). */
const LINKEDIN_REST_VERSION = "202510.03";

const IDENTITY_ME_URL = "https://api.linkedin.com/rest/identityMe";

export type LinkedInIdentityMeResponse = {
  id?: string;
  basicInfo?: {
    profileUrl?: string;
    firstName?: { localized?: Record<string, string> };
    lastName?: { localized?: Record<string, string> };
    primaryEmailAddress?: string;
    profilePicture?: unknown;
  };
};

export type FetchLinkedInUrlResult =
  | { success: true; url: string | null; updated: boolean }
  | { success: false; error: string };

function isLinkedInSession(session: {
  user: { app_metadata?: Record<string, unknown> };
}): boolean {
  const provider = session.user.app_metadata?.provider as string | undefined;
  const providers = session.user.app_metadata?.providers as
    | string[]
    | undefined;
  return (
    provider === "linkedin_oidc" ||
    (Array.isArray(providers) && providers.includes("linkedin_oidc"))
  );
}

/**
 * Fetches `basicInfo.profileUrl` from LinkedIn `/rest/identityMe` using the
 * session's `provider_token`, then updates `profiles.linkedin_url` when valid.
 * Safe to call from Route Handlers or Server Actions using the same Supabase
 * client that just completed `exchangeCodeForSession` (token available briefly).
 */
export async function syncLinkedInProfileUrlFromSession(
  supabase: SupabaseClient<Database>
): Promise<FetchLinkedInUrlResult> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return { success: false, error: "No session" };
  }

  if (!isLinkedInSession(session)) {
    return { success: false, error: "Not a LinkedIn session" };
  }

  const token = session.provider_token;
  if (!token) {
    return { success: false, error: "No provider token" };
  }

  let res: Response;
  try {
    res = await fetch(IDENTITY_ME_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "LinkedIn-Version": LINKEDIN_REST_VERSION,
      },
      cache: "no-store",
    });
  } catch (err) {
    console.error("[linkedin] identityMe network error:", err);
    return { success: false, error: "LinkedIn request failed" };
  }

  if (!res.ok) {
    console.error("[linkedin] identityMe HTTP", res.status);
    return { success: false, error: `LinkedIn API error ${res.status}` };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    console.error("[linkedin] identityMe invalid JSON");
    return { success: false, error: "Invalid LinkedIn response" };
  }

  const typed = body as LinkedInIdentityMeResponse;
  const rawUrl = typed.basicInfo?.profileUrl?.trim();
  if (!rawUrl) {
    return { success: true, url: null, updated: false };
  }

  const parsed = normalizeLinkedInProfileUrl(rawUrl);
  if (!parsed.ok) {
    console.warn("[linkedin] profileUrl rejected:", rawUrl.slice(0, 120));
    return { success: true, url: null, updated: false };
  }

  const normalized = parsed.url;
  const userId = session.user.id;

  const { data: row, error: selectError } = await supabase
    .from("profiles")
    .select("linkedin_url")
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("[linkedin] profile select:", selectError);
    return { success: false, error: selectError.message };
  }

  if (row?.linkedin_url === normalized) {
    return { success: true, url: normalized, updated: false };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ linkedin_url: normalized })
    .eq("id", userId);

  if (updateError) {
    console.error("[linkedin] profile update:", updateError);
    return { success: false, error: updateError.message };
  }

  revalidatePath("/dashboard");
  return { success: true, url: normalized, updated: true };
}
