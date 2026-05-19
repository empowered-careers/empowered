import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

import { env } from "../../../env";

/**
 * Service-role Supabase client for server-only background work
 * (parse-resume, sync-linkedin, etc.). Bypasses RLS — never expose to the browser.
 */
export function createServiceClient() {
  if (!env.SUPABASE_SECRET_KEY) {
    throw new Error(
      "SUPABASE_SECRET_KEY is required for service-role operations"
    );
  }
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
