import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { RelationshipType, UserRole } from "@/types/db";

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

/**
 * Server-side authenticated-user guard for Server Actions and Route Handlers.
 *
 * Returns the authenticated user id, or redirects unauthenticated callers to
 * /login. No role check — use where any signed-in user is allowed (billing,
 * checkout, self-service flows). Mirrors `requireAdmin()` / `requireEmployer()`.
 */
export async function requireUser(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { userId: user.id };
}

/**
 * Server-side employer guard for Server Actions, Route Handlers, and the
 * `/employer/*` layout.
 *
 * Allowed roles: `admin` (so Lauren can impersonate-view) and `employer`.
 * Redirects:
 *   - unauthenticated                            → /login
 *   - role not in (admin, employer)              → /dashboard
 *   - role = employer with null employer_id      → /employer-not-linked
 *
 * For admins, `employerId` and `relationshipType` are null — admins are
 * not scoped to a single employer row.
 */
export async function requireEmployer(): Promise<{
  userId: string;
  role: UserRole;
  employerId: string | null;
  relationshipType: RelationshipType | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, employer_id")
    .eq("id", user.id)
    .single();

  const role = profile?.role as UserRole | undefined;
  if (role !== "admin" && role !== "employer") {
    redirect("/dashboard");
  }

  const employerId = profile?.employer_id ?? null;

  if (role === "employer" && !employerId) {
    redirect("/employer-not-linked");
  }

  let relationshipType: RelationshipType | null = null;
  if (employerId) {
    const { data: employer } = await supabase
      .from("employers")
      .select("relationship_type")
      .eq("id", employerId)
      .single();
    relationshipType =
      (employer?.relationship_type as RelationshipType | undefined) ?? null;
  }

  return { userId: user.id, role, employerId, relationshipType };
}

/**
 * Assert the caller is scoped to a specific employer row (or is an admin).
 * Use inside server actions that mutate per-row data, as defense-in-depth
 * alongside RLS.
 */
export async function requireEmployerScope(
  employerId: string
): Promise<{ userId: string; role: UserRole }> {
  const ctx = await requireEmployer();
  if (ctx.role === "admin") {
    return { userId: ctx.userId, role: ctx.role };
  }
  if (ctx.employerId !== employerId) {
    redirect("/dashboard");
  }
  return { userId: ctx.userId, role: ctx.role };
}
