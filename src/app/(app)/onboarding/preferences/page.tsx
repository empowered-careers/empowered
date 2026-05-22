import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PreferencesForm } from "@/components/onboarding/preferences-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Complete your profile | Empowered Careers",
  robots: { index: false, follow: false },
};

export default async function OnboardingPreferencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [prefsResult, resumeResult] = await Promise.all([
    supabase
      .from("candidate_preferences")
      .select(
        "target_role, target_seniority, industries, switch_urgency, notice_period_days, work_authorization"
      )
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("resumes")
      .select("seniority_level")
      .eq("profile_id", user.id)
      .eq("is_current", true)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const existing = prefsResult.data;
  const seniorityFromResume = resumeResult.data?.seniority_level ?? null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-6 space-y-2">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Tell us what you&apos;re looking for
        </h1>
        <p className="text-sm text-muted-foreground">
          Six quick fields. We use these to match you with roles and to time our
          outreach. You can change everything later from{" "}
          <span className="font-mono text-xs">/profile</span>.
        </p>
      </header>
      <PreferencesForm
        initial={{
          target_role: existing?.target_role ?? "",
          target_seniority:
            existing?.target_seniority ?? seniorityFromResume ?? "",
          industries: existing?.industries ?? [],
          switch_urgency: existing?.switch_urgency ?? null,
          notice_period_days: existing?.notice_period_days ?? null,
          work_authorization: existing?.work_authorization ?? null,
        }}
      />
    </div>
  );
}
