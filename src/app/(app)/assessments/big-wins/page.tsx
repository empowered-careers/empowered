import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BigWinsClient } from "@/components/assessment/big-wins-client";
import {
  type BigWinsAnswers,
  type BigWinsResult,
  rolesFromParsed,
} from "@/lib/assessment/big-wins";
import { BIG_WINS_ASSESSMENT_ID } from "@/lib/assessment/constants";
import type { ParsedResume } from "@/lib/llm/schemas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Big Wins | Empowered Careers",
  robots: { index: false, follow: false },
};

export default async function BigWinsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Gate: Big Wins rewrites the roles on a parsed resume, so it needs one.
  const { data: resume } = await supabase
    .from("resumes")
    .select("parsed_json")
    .eq("profile_id", user.id)
    .eq("is_current", true)
    .eq("status", "complete")
    .maybeSingle();

  const parsed = resume?.parsed_json as ParsedResume | null;
  if (!parsed?.work_experience?.length) redirect("/resume");

  const { data: response } = await supabase
    .from("assessment_responses")
    .select("responses, result")
    .eq("profile_id", user.id)
    .eq("assessment_id", BIG_WINS_ASSESSMENT_ID)
    .maybeSingle();

  const { role } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <BigWinsClient
        roles={rolesFromParsed(parsed.work_experience)}
        initialAnswers={(response?.responses as BigWinsAnswers | null) ?? {}}
        initialResult={(response?.result as BigWinsResult | null) ?? null}
        startRoleKey={role ?? null}
      />
    </div>
  );
}
