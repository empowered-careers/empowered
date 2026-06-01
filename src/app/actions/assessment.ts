"use server";

import { revalidatePath } from "next/cache";

import {
  computeAxes,
  deriveCandidateScores,
  scoreBlueprint,
} from "@/lib/assessment/blueprint";
import {
  BLUEPRINT_ASSESSMENT_ID,
  BLUEPRINT_QUESTION_COUNT,
} from "@/lib/assessment/constants";
import type { Answers, BlueprintResult } from "@/lib/assessment/types";
import { createClient } from "@/lib/supabase/server";
import type {
  AssessmentResponseInsert,
  CandidateScoresInsert,
} from "@/types/db";

export type SubmitBlueprintResult =
  | { ok: true; result: BlueprintResult }
  | { ok: false; error: string };

/**
 * Compute the Career Identity Blueprint result and persist it.
 *
 * Synchronous — no Inngest, no Realtime notification hook. The scoring engine
 * is pure TypeScript, so we compute and return the display blob in the same
 * request that writes to the database.
 *
 * Upserts:
 *   - assessment_responses (one row per (profile_id, assessment_id))
 *   - candidate_scores     (one row per profile_id)
 */
export async function submitBlueprint(
  answers: Answers
): Promise<SubmitBlueprintResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const answeredKeys = Object.keys(answers);
  if (answeredKeys.length !== BLUEPRINT_QUESTION_COUNT) {
    return {
      ok: false,
      error: `Please answer all ${BLUEPRINT_QUESTION_COUNT} questions.`,
    };
  }
  for (let i = 0; i < BLUEPRINT_QUESTION_COUNT; i++) {
    const v = answers[i];
    if (typeof v !== "number" || v < 0 || v > 3 || !Number.isInteger(v)) {
      return { ok: false, error: `Invalid answer for question ${i + 1}.` };
    }
  }

  const axes = computeAxes(answers);
  const result = scoreBlueprint(answers);
  const derived = deriveCandidateScores(axes);

  const responsePayload: AssessmentResponseInsert = {
    profile_id: user.id,
    assessment_id: BLUEPRINT_ASSESSMENT_ID,
    responses: answers,
    score: result.overall,
    result: result as unknown as AssessmentResponseInsert["result"],
    archetype: result.archetype.name,
    completed_at: new Date().toISOString(),
  };

  const { error: respErr } = await supabase
    .from("assessment_responses")
    .upsert(responsePayload, { onConflict: "profile_id,assessment_id" });
  if (respErr) {
    console.error("[submitBlueprint] assessment_responses upsert:", respErr);
    return { ok: false, error: respErr.message };
  }

  const scoresPayload: CandidateScoresInsert = {
    profile_id: user.id,
    culture_axes: axes as unknown as CandidateScoresInsert["culture_axes"],
    role_clarity_score: derived.role_clarity_score,
    values_score: derived.values_score,
    strengths_score: derived.strengths_score,
    leadership_score: derived.leadership_score,
    impact_score: derived.impact_score,
    overall_score: derived.overall_score,
    updated_at: new Date().toISOString(),
  };

  const { error: scoreErr } = await supabase
    .from("candidate_scores")
    .upsert(scoresPayload, { onConflict: "profile_id" });
  if (scoreErr) {
    console.error("[submitBlueprint] candidate_scores upsert:", scoreErr);
    return { ok: false, error: scoreErr.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/assessments");
  revalidatePath("/assessments/ci-blueprint");

  return { ok: true, result };
}
