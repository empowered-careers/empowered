import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { normalizeLinkedInProfileUrl } from "@/lib/linkedin-url";
import type { Database, Json } from "@/types/database.types";

/** LinkedIn REST API version header (see LinkedIn developer docs). */
const LINKEDIN_REST_VERSION = "202510.03";

const IDENTITY_ME_URL = "https://api.linkedin.com/rest/identityMe";

/**
 * Classic v2 Profile API — works with the `r_profile_basicinfo`/`r_basicprofile`
 * scope our LinkedIn developer app currently holds. Returns headline + names +
 * vanity URL slug + photo (anything richer needs Partner-tier scopes we don't have).
 */
const PROFILE_API_URL =
  "https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,localizedHeadline,vanityName,profilePicture(displayImage~:playableStreams))";

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

export type LinkedInProfileApiResponse = {
  id?: string;
  localizedFirstName?: string;
  localizedLastName?: string;
  localizedHeadline?: string;
  vanityName?: string;
  profilePicture?: unknown;
};

export type FetchLinkedInUrlResult =
  | {
      success: true;
      url: string | null;
      updated: boolean;
      headline: string | null;
    }
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

async function fetchIdentityMe(
  token: string
): Promise<LinkedInIdentityMeResponse | null> {
  try {
    const res = await fetch(IDENTITY_ME_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "LinkedIn-Version": LINKEDIN_REST_VERSION,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[linkedin] identityMe HTTP", res.status);
      return null;
    }
    return (await res.json()) as LinkedInIdentityMeResponse;
  } catch (err) {
    console.error("[linkedin] identityMe network error:", err);
    return null;
  }
}

async function fetchProfileApi(
  token: string
): Promise<LinkedInProfileApiResponse | null> {
  try {
    const res = await fetch(PROFILE_API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      // 401/403 here means the scope isn't granted — non-fatal, we still
      // captured the URL via identityMe.
      console.warn("[linkedin] /v2/me HTTP", res.status);
      return null;
    }
    return (await res.json()) as LinkedInProfileApiResponse;
  } catch (err) {
    console.error("[linkedin] /v2/me network error:", err);
    return null;
  }
}

/**
 * Fetches LinkedIn profile data using the session's `provider_token` and
 * persists it across two tables:
 *   - `profiles.linkedin_url`  ← from `/rest/identityMe` basicInfo.profileUrl
 *   - `linkedin_profiles` row  ← from `/v2/me` (headline, raw_json)
 *
 * Safe to call from Route Handlers or Server Actions using the same Supabase
 * client that just completed `exchangeCodeForSession` (token available briefly).
 *
 * The `linkedin_profiles.status` field stays `'idle'` after this runs — it is
 * owned by the PDF-upload sync flow (`/api/sync-linkedin`), which fills
 * `summary`, `profile_score`, and flips status to `complete`.
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

  const [identityMe, profileApi] = await Promise.all([
    fetchIdentityMe(token),
    fetchProfileApi(token),
  ]);

  if (!identityMe) {
    return { success: false, error: "LinkedIn identityMe call failed" };
  }

  // Prefer the vanityName from /v2/me to build a clean /in/<handle> URL.
  // identityMe.basicInfo.profileUrl is a `profile-thirdparty-redirect` URL,
  // so it's only used as a fallback when the /v2/me scope is unavailable.
  const vanityName = profileApi?.vanityName?.trim();
  const rawUrl = vanityName
    ? `https://www.linkedin.com/in/${vanityName}`
    : identityMe.basicInfo?.profileUrl?.trim();
  const userId = session.user.id;

  let normalizedUrl: string | null = null;
  let urlUpdated = false;

  if (rawUrl) {
    const parsed = normalizeLinkedInProfileUrl(rawUrl);
    if (parsed.ok) {
      normalizedUrl = parsed.url;

      const { data: row, error: selectError } = await supabase
        .from("profiles")
        .select("linkedin_url")
        .eq("id", userId)
        .maybeSingle();

      if (selectError) {
        console.error("[linkedin] profile select:", selectError);
        return { success: false, error: selectError.message };
      }

      if (row?.linkedin_url !== normalizedUrl) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ linkedin_url: normalizedUrl })
          .eq("id", userId);

        if (updateError) {
          console.error("[linkedin] profile update:", updateError);
          return { success: false, error: updateError.message };
        }
        urlUpdated = true;
      }
    } else {
      console.warn("[linkedin] profileUrl rejected:", rawUrl.slice(0, 120));
    }
  }

  const headline = profileApi?.localizedHeadline?.trim() || null;

  if (normalizedUrl) {
    const rawJson: Json = {
      identityMe: identityMe as unknown as Json,
      profileApi: (profileApi ?? null) as Json,
      capturedAt: new Date().toISOString(),
    };

    const { data: existing, error: existingError } = await supabase
      .from("linkedin_profiles")
      .select("id, status, summary")
      .eq("profile_id", userId)
      .maybeSingle();

    if (existingError) {
      console.error("[linkedin] linkedin_profiles select:", existingError);
    } else if (existing) {
      // Keep the PDF-sourced summary + status; only refresh headline/url/raw_json.
      await supabase
        .from("linkedin_profiles")
        .update({
          linkedin_url: normalizedUrl,
          headline,
          raw_json: rawJson,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("linkedin_profiles").insert({
        profile_id: userId,
        linkedin_url: normalizedUrl,
        headline,
        raw_json: rawJson,
        status: "idle",
      });
    }
  }

  revalidatePath("/dashboard");
  return {
    success: true,
    url: normalizedUrl,
    updated: urlUpdated,
    headline,
  };
}
