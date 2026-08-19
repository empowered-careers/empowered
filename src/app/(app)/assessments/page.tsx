import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AssessmentsIndex } from "@/components/assessment/assessments-index";
import { type BigWinsResult, rolesFromParsed } from "@/lib/assessment/big-wins";
import {
  BIG_WINS_ASSESSMENT_ID,
  BLUEPRINT_ASSESSMENT_ID,
  ROLE_CLARITY_ASSESSMENT_ID,
} from "@/lib/assessment/constants";
import type { RoleClarityResult } from "@/lib/assessment/role-clarity";
import type { BlueprintResult } from "@/lib/assessment/types";
import type { ParsedResume } from "@/lib/llm/schemas";
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

  const [{ data }, { data: winsRow }, { data: clarityRow }, { data: resume }] =
    await Promise.all([
      supabase
        .from("assessment_responses")
        .select("result, archetype, completed_at")
        .eq("profile_id", user.id)
        .eq("assessment_id", BLUEPRINT_ASSESSMENT_ID)
        .maybeSingle(),
      supabase
        .from("assessment_responses")
        .select("result, completed_at")
        .eq("profile_id", user.id)
        .eq("assessment_id", BIG_WINS_ASSESSMENT_ID)
        .maybeSingle(),
      supabase
        .from("assessment_responses")
        .select("result, completed_at")
        .eq("profile_id", user.id)
        .eq("assessment_id", ROLE_CLARITY_ASSESSMENT_ID)
        .maybeSingle(),
      supabase
        .from("resumes")
        .select("parsed_json")
        .eq("profile_id", user.id)
        .eq("is_current", true)
        .eq("status", "complete")
        .maybeSingle(),
    ]);

  const blueprint = data
    ? {
        archetype: data.archetype,
        completed_at: data.completed_at,
        result: (data.result as BlueprintResult | null) ?? null,
      }
    : null;

  // Big Wins progress is "how many of the current resume's roles have a rewrite",
  // so roles from a superseded resume don't inflate the count.
  const roles = rolesFromParsed(
    (resume?.parsed_json as ParsedResume | null)?.work_experience ?? []
  );
  const overlay = (winsRow?.result as BigWinsResult | null)?.roles ?? {};
  const bigWins = {
    rewritten: roles.filter((r) => (overlay[r.key]?.bullets.length ?? 0) > 0)
      .length,
    total: roles.length,
    completed_at: winsRow?.completed_at ?? null,
  };

  const roleClarity = clarityRow
    ? {
        completed_at: clarityRow.completed_at,
        result: (clarityRow.result as RoleClarityResult | null) ?? null,
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
      <AssessmentsIndex
        blueprint={blueprint}
        bigWins={bigWins}
        roleClarity={roleClarity}
      />
    </div>
  );
}
