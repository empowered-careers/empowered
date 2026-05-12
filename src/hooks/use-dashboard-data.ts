import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import type { SubscriptionTier, SubscriptionStatus } from "@/types/supabase";

export type DashboardProfile = {
  id: string;
  full_name: string | null;
  linkedin_url: string | null;
  linkedin_provider_id: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
};

export type DashboardResume = {
  id: string;
  uploaded_at: string;
  ats_score: number | null;
  file_name: string | null;
};

export type DashboardData = {
  profile: DashboardProfile | null;
  resumes: DashboardResume[];
  activeJobCount: number;
};

async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const supabase = createClient();

  const [profileResult, resumesResult, jobCountResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, linkedin_url, linkedin_provider_id, subscription_tier, subscription_status"
      )
      .eq("id", userId)
      .single(),

    supabase
      .from("resumes")
      .select("id, uploaded_at, ats_score, file_name")
      .eq("profile_id", userId)
      .order("uploaded_at", { ascending: false }),

    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  if (profileResult.error && profileResult.error.code !== "PGRST116") {
    // PGRST116 = row not found – new users may not have a profile row yet
    console.error("[dashboard] profile fetch error:", profileResult.error);
  }

  if (resumesResult.error) {
    console.error("[dashboard] resumes fetch error:", resumesResult.error);
  }

  return {
    profile: profileResult.data ?? null,
    resumes: resumesResult.data ?? [],
    activeJobCount: jobCountResult.count ?? 0,
  };
}

export function useDashboardData() {
  const { user, isLoading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: () => fetchDashboardData(user!.id),
    enabled: !authLoading && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
}

/** Helper: is this user on a paid plan with an active status? */
export function isPaidUser(profile: DashboardProfile | null): boolean {
  if (!profile) return false;
  return (
    (profile.subscription_tier === "paid_monthly" ||
      profile.subscription_tier === "paid_annual") &&
    profile.subscription_status === "active"
  );
}

/** Percentage of profile strength steps completed (0-100). */
export function getProfileStrength(
  profile: DashboardProfile | null,
  resumes: DashboardResume[]
): { completed: number; total: number; percentage: number } {
  const total = 5;
  let completed = 0;

  if (profile?.full_name) completed++;                     // 1. name filled
  if (profile?.linkedin_url) completed++;                  // 2. LinkedIn URL
  if (resumes.length > 0) completed++;                     // 3. resume uploaded
  if (resumes.some((r) => r.ats_score !== null)) completed++; // 4. ATS scored
  // 5. subscription active (any tier counts as step)
  if (profile?.subscription_status === "active") completed++;

  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
  };
}
