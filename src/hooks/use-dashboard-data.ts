import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { BLUEPRINT_ASSESSMENT_ID } from "@/lib/assessment/constants";
import { queryKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";
import type { BillingCadence, Plan, SubscriptionStatus } from "@/types/db";

export type DashboardProfile = {
  id: string;
  full_name: string | null;
  linkedin_url: string | null;
  linkedin_provider_id: string | null;
  plan: Plan;
  billing_cadence: BillingCadence | null;
  subscription_status: SubscriptionStatus;
  onboarding_completed_at: string | null;
};

export type DashboardResume = {
  id: string;
  uploaded_at: string;
  resume_score: number | null;
  file_name: string | null;
};

export type DashboardBlueprint = {
  archetype: string | null;
  completed_at: string;
};

export type DashboardData = {
  profile: DashboardProfile | null;
  resumes: DashboardResume[];
  activeJobCount: number;
  blueprint: DashboardBlueprint | null;
};

async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const supabase = createClient();

  const [profileResult, resumesResult, jobCountResult, blueprintResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, linkedin_url, linkedin_provider_id, plan, billing_cadence, subscription_status, onboarding_completed_at"
        )
        .eq("id", userId)
        .single(),

      supabase
        .from("resumes")
        .select("id, uploaded_at, resume_score, file_name")
        .eq("profile_id", userId)
        .order("uploaded_at", { ascending: false }),

      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),

      supabase
        .from("assessment_responses")
        .select("archetype, completed_at")
        .eq("profile_id", userId)
        .eq("assessment_id", BLUEPRINT_ASSESSMENT_ID)
        .maybeSingle(),
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
    blueprint: blueprintResult.data ?? null,
  };
}

export function useDashboardData() {
  const { user, isLoading: authLoading } = useAuth();

  return useQuery({
    queryKey: queryKeys.dashboard.byUser(user?.id ?? ""),
    queryFn: () => fetchDashboardData(user!.id),
    enabled: !authLoading && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
}

/** Helper: is this user on a paid plan with an active status? */
export function isPaidUser(profile: DashboardProfile | null): boolean {
  if (!profile) return false;
  return profile.plan !== "free" && profile.subscription_status === "active";
}

/** Percentage of profile strength steps completed (0-100). */
export function getProfileStrength(
  profile: DashboardProfile | null,
  resumes: DashboardResume[],
  hasBlueprint = false
): { completed: number; total: number; percentage: number } {
  const total = 7;
  let completed = 0;

  if (profile?.full_name) completed++; // 1. name filled
  if (profile?.linkedin_url) completed++; // 2. LinkedIn URL
  if (resumes.length > 0) completed++; // 3. resume uploaded
  if (resumes.some((r) => r.resume_score !== null)) completed++; // 4. Resume scored
  if (profile?.onboarding_completed_at) completed++; // 5. job preferences
  if (hasBlueprint) completed++; // 6. Career Identity Blueprint
  // 7. subscription active (any tier counts as step)
  if (profile?.subscription_status === "active") completed++;

  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
  };
}
