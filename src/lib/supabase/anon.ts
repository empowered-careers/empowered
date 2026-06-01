import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Cookieless anonymous Supabase client for statically-generated routes
 * (sitemap.ts, llms.txt, etc.) that must not depend on a user session.
 * Reads are bounded by the `events_read_public` RLS policy.
 */
export function createAnonClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
