import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Server-side admin guard for Server Actions and Route Handlers.
 *
 * Returns the authenticated admin user id, or redirects:
 *   - unauthenticated → /login
 *   - non-admin       → /dashboard
 *
 * RLS still enforces admin-only writes at the database; this helper exists
 * so server actions fail fast (and with a useful redirect) before they hit
 * Postgres.
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return { userId: user.id };
}
