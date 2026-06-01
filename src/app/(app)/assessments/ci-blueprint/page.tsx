import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AssessmentClient } from "@/components/assessment/assessment-client";
import { BLUEPRINT_ASSESSMENT_ID } from "@/lib/assessment/constants";
import type { BlueprintResult } from "@/lib/assessment/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Career Identity Blueprint | Empowered Careers",
  robots: { index: false, follow: false },
};

export default async function AssessmentPage() {
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

  const initialResult =
    (data?.result as BlueprintResult | null | undefined) ?? null;
  const initialCompletedAt = data?.completed_at ?? null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <AssessmentClient
        initialResult={initialResult}
        initialCompletedAt={initialCompletedAt}
      />
    </div>
  );
}
