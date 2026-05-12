"use server";

import { createClient } from "@/lib/supabase/server";
import {
  syncLinkedInProfileUrlFromSession,
  type FetchLinkedInUrlResult,
} from "@/lib/linkedin-identity-sync";

export type { FetchLinkedInUrlResult };

/**
 * Uses the current Supabase session's LinkedIn `provider_token` to call
 * `/rest/identityMe` and persist `basicInfo.profileUrl` to `profiles.linkedin_url`.
 * Errors are returned, not thrown — safe for post-OAuth flows.
 */
export async function fetchAndStoreLinkedInUrl(): Promise<FetchLinkedInUrlResult> {
  const supabase = await createClient();
  return syncLinkedInProfileUrlFromSession(supabase);
}
