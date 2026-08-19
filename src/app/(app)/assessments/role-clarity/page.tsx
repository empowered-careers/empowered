import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RoleClarityClient } from "@/components/assessment/role-clarity/role-clarity-client";
import { ROLE_CLARITY_ASSESSMENT_ID } from "@/lib/assessment/constants";
import type { RoleClarityResult } from "@/lib/assessment/role-clarity";
import { fetchDashboardSignals } from "@/lib/dashboard/signals";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Role Clarity | Empowered Careers",
  robots: { index: false, follow: false },
};

export default async function RoleClarityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data }, { data: resume }, { data: linkedin }] = await Promise.all([
    supabase
      .from("assessment_responses")
      .select("result, completed_at")
      .eq("profile_id", user.id)
      .eq("assessment_id", ROLE_CLARITY_ASSESSMENT_ID)
      .maybeSingle(),
    supabase
      .from("resumes")
      .select("resume_score")
      .eq("profile_id", user.id)
      .eq("is_current", true)
      .maybeSingle(),
    supabase
      .from("linkedin_profiles")
      .select("profile_score")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  // Same engine the dashboard uses, so the results CTA and the dashboard nudge
  // never disagree about what this candidate needs next.
  const { prescription } = await fetchDashboardSignals(
    user.id,
    resume?.resume_score ?? null,
    linkedin?.profile_score ?? null
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <RoleClarityClient
        initialResult={(data?.result as RoleClarityResult | null) ?? null}
        initialCompletedAt={data?.completed_at ?? null}
        prescription={prescription}
      />
    </div>
  );
}
