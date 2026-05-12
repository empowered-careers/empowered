import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { PageShell } from "@/components/page-shell";
import type { DashboardProfile, DashboardResume } from "@/hooks/use-dashboard-data";
import { syncLinkedInProfileUrlFromSession } from "@/lib/linkedin-identity-sync";
import { createClient } from "@/lib/supabase/server";

/**
 * Dashboard Page — Server Component
 *
 * 1. Authenticates the request server-side (no flash redirect to login).
 * 2. Fetches profile, resumes, and active job count in a single parallel
 *    round-trip before the page ships to the browser.
 * 3. Passes hydrated data to <DashboardClient> so the user never sees
 *    a loading spinner on the initial render.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  // ── Auth guard ──────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ── Parallel data fetches ──────────────────────────────────────────────────
  const [profileResult, resumesResult, jobCountResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, linkedin_url, linkedin_provider_id, subscription_tier, subscription_status"
      )
      .eq("id", user.id)
      .single(),

    supabase
      .from("resumes")
      .select("id, uploaded_at, ats_score, file_name")
      .eq("profile_id", user.id)
      .order("uploaded_at", { ascending: false }),

    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  // Non-fatal: new users may not have a profile row yet (PGRST116 = no rows)
  if (
    profileResult.error &&
    profileResult.error.code !== "PGRST116"
  ) {
    console.error("[dashboard] profile fetch error:", profileResult.error);
  }

  const profile = (profileResult.data as DashboardProfile | null) ?? null;
  const resumes = (resumesResult.data as DashboardResume[]) ?? [];
  const activeJobCount = jobCountResult.count ?? 0;

  if (
    profile &&
    !profile.linkedin_url &&
    profile.linkedin_provider_id
  ) {
    void syncLinkedInProfileUrlFromSession(supabase).catch(() => {
      // Best-effort backfill; `provider_token` may be absent or expired.
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageShell>
      <DashboardClient
        profile={profile}
        resumes={resumes}
        activeJobCount={activeJobCount}
        userEmail={user.email ?? ""}
      />
    </PageShell>
  );
}
