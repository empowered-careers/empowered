import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileClient } from "@/components/profile/profile-client";
import { BLUEPRINT_ASSESSMENT_ID } from "@/lib/assessment/constants";
import type { BlueprintResult } from "@/lib/assessment/types";
import { createClient } from "@/lib/supabase/server";
import type { CandidatePreferencesRow } from "@/types/db";

export const metadata: Metadata = {
  title: "My Profile | Empowered Careers",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileResult, prefsResult, blueprintResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, linkedin_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("candidate_preferences")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("assessment_responses")
      .select("archetype, completed_at, result")
      .eq("profile_id", user.id)
      .eq("assessment_id", BLUEPRINT_ASSESSMENT_ID)
      .maybeSingle(),
  ]);

  const profile = profileResult.data;
  const preferences = (prefsResult.data ??
    null) as CandidatePreferencesRow | null;
  const blueprint = blueprintResult.data
    ? {
        archetype: blueprintResult.data.archetype,
        completed_at: blueprintResult.data.completed_at,
        result: (blueprintResult.data.result as BlueprintResult | null) ?? null,
      }
    : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 space-y-1">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          My Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Edit your search criteria, comp expectations, and company list. Saved
          inline.
        </p>
      </header>
      <ProfileClient
        profile={{
          id: profile?.id ?? user.id,
          full_name: profile?.full_name ?? null,
          email: profile?.email ?? user.email ?? "",
          phone: profile?.phone ?? null,
          linkedin_url: profile?.linkedin_url ?? null,
        }}
        preferences={preferences}
        blueprint={blueprint}
      />
    </div>
  );
}
