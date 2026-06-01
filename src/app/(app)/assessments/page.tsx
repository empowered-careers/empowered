import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AssessmentsIndex } from "@/components/assessment/assessments-index";
import { BLUEPRINT_ASSESSMENT_ID } from "@/lib/assessment/constants";
import type { BlueprintResult } from "@/lib/assessment/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Assessments | Empowered Careers",
  robots: { index: false, follow: false },
};

export default async function AssessmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("assessment_responses")
    .select("result, archetype, completed_at")
    .eq("profile_id", user.id)
    .eq("assessment_id", BLUEPRINT_ASSESSMENT_ID)
    .maybeSingle();

  const blueprint = data
    ? {
        archetype: data.archetype,
        completed_at: data.completed_at,
        result: (data.result as BlueprintResult | null) ?? null,
      }
    : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 space-y-1">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Assessments
        </h1>
        <p className="text-sm text-muted-foreground">
          A progressive suite of scans that sharpen your matches and the voice
          we use in your resume and LinkedIn. Start with the Blueprint — the
          rest unlock over Phase 2.
        </p>
      </header>
      <AssessmentsIndex blueprint={blueprint} />
    </div>
  );
}
