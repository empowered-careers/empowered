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

  const { data: existing } = await supabase
    .from("candidate_preferences")
    .select("target_role")
    .eq("profile_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <header className="mb-8 space-y-1.5">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Empowered Careers™ — new member assessment
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          15 quick questions to personalize your experience and connect you with
          the right resources.
        </p>
      </header>
      <PreferencesForm initialRole={existing?.target_role ?? ""} />
    </div>
  );
}
