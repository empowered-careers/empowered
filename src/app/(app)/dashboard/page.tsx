import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import type {
  DashboardProfile,
  DashboardResume,
} from "@/hooks/use-dashboard-data";
import { syncLinkedInProfileUrlFromSession } from "@/lib/linkedin-identity-sync";
import { createClient } from "@/lib/supabase/server";

/**
 * Dashboard Page — Server Component
 *
 * Auth guard runs at the (app) layout level; this page focuses on the
 * dashboard-specific data fetches.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResult, resumesResult, jobCountResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, linkedin_url, linkedin_provider_id, plan, billing_cadence, subscription_status, onboarding_completed_at"
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

  if (profileResult.error && profileResult.error.code !== "PGRST116") {
    console.error("[dashboard] profile fetch error:", profileResult.error);
  }

  const profile = (profileResult.data as DashboardProfile | null) ?? null;
  const resumes = (resumesResult.data as DashboardResume[]) ?? [];
  const activeJobCount = jobCountResult.count ?? 0;

  if (profile && !profile.linkedin_url && profile.linkedin_provider_id) {
    void syncLinkedInProfileUrlFromSession(supabase).catch(() => {
      // Best-effort backfill; provider_token may be absent or expired.
    });
  }

  return (
    <div className="px-10 py-8">
      <DashboardClient
        activeJobCount={activeJobCount}
        profile={profile}
        resumes={resumes}
        userEmail={user.email ?? ""}
      />
    </div>
  );
}
