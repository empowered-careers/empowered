import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import type {
  DashboardBlueprint,
  DashboardProfile,
  DashboardResume,
} from "@/hooks/use-dashboard-data";
import { BLUEPRINT_ASSESSMENT_ID } from "@/lib/assessment/constants";
import { fetchMyCoaching } from "@/lib/coaching";
import type { InterviewingApplication } from "@/lib/dashboard/nudges";
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

  const [
    profileResult,
    resumesResult,
    blueprintResult,
    interviewingResult,
    linkedinResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, linkedin_url, linkedin_provider_id, plan, billing_cadence, subscription_status, onboarding_completed_at"
      )
      .eq("id", user.id)
      .single(),

    supabase
      .from("resumes")
      .select("id, uploaded_at, resume_score, file_name")
      .eq("profile_id", user.id)
      .order("uploaded_at", { ascending: false }),

    supabase
      .from("assessment_responses")
      .select("archetype, completed_at")
      .eq("profile_id", user.id)
      .eq("assessment_id", BLUEPRINT_ASSESSMENT_ID)
      .maybeSingle(),

    supabase
      .from("applications")
      .select("id, job_id, updated_at, jobs:job_id(id, title, company_name)")
      .eq("profile_id", user.id)
      .eq("status", "interviewing")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("linkedin_profiles")
      .select("profile_score")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  if (profileResult.error && profileResult.error.code !== "PGRST116") {
    console.error("[dashboard] profile fetch error:", profileResult.error);
  }

  const profile = (profileResult.data as DashboardProfile | null) ?? null;
  const resumes = (resumesResult.data as DashboardResume[]) ?? [];

  // Resume-before-dashboard hard gate: a candidate must have uploaded a resume
  // before reaching the dashboard. Mirrors the onboarding soft-gate redirect.
  if (resumes.length === 0) {
    redirect("/resume");
  }

  // Not in the Promise.all above: fetchMyCoaching runs its own two queries, and
  // there's no point starting them before the resume gate has let us through.
  const coaching = await fetchMyCoaching(user.id);

  const linkedinScore = (linkedinResult.data?.profile_score ?? null) as
    | number
    | null;
  const blueprint = (blueprintResult.data as DashboardBlueprint | null) ?? null;

  const interviewingRow = interviewingResult.data as {
    id: string;
    updated_at: string;
    jobs: {
      id: string;
      title: string | null;
      company_name: string | null;
    } | null;
  } | null;
  const interviewingApplication: InterviewingApplication | null =
    interviewingRow
      ? {
          id: interviewingRow.id,
          updated_at: interviewingRow.updated_at,
          job: interviewingRow.jobs,
        }
      : null;

  if (profile && !profile.linkedin_url && profile.linkedin_provider_id) {
    void syncLinkedInProfileUrlFromSession(supabase).catch(() => {
      // Best-effort backfill; provider_token may be absent or expired.
    });
  }

  return (
    <div className="px-10 py-8">
      <DashboardClient
        blueprint={blueprint}
        coaching={coaching}
        interviewingApplication={interviewingApplication}
        linkedinScore={linkedinScore}
        profile={profile}
        resumes={resumes}
        userEmail={user.email ?? ""}
      />
    </div>
  );
}
