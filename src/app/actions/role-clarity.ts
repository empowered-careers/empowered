"use server";

import { revalidatePath } from "next/cache";

import {
  ROLE_CLARITY_ASSESSMENT_ID,
  ROLE_CLARITY_QUESTION_COUNT,
} from "@/lib/assessment/constants";
import {
  optionCount,
  QUESTIONS,
  type RoleClarityAnswers,
  type RoleClarityResult,
  scoreRoleClarity,
} from "@/lib/assessment/role-clarity";
import { createNotification } from "@/lib/notifications/create";
import { createClient } from "@/lib/supabase/server";
import type {
  AssessmentResponseInsert,
  CandidateScoresInsert,
} from "@/types/db";

export type SubmitRoleClarityResult =
  | { ok: true; result: RoleClarityResult }
  | { ok: false; error: string };

/**
 * Compute the Role Clarity result and persist it.
 *
 * Synchronous, same shape as `submitBlueprint` — the scoring engine is pure
 * arithmetic, so we compute and return the display blob in the request that
 * writes it.
 *
 * Upserts:
 *   - assessment_responses (one row per (profile_id, assessment_id))
 *   - candidate_scores.role_clarity_score (normalised 0–100)
 */
export async function submitRoleClarity(
  answers: RoleClarityAnswers
): Promise<SubmitRoleClarityResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  if (Object.keys(answers).length !== ROLE_CLARITY_QUESTION_COUNT) {
    return {
      ok: false,
      error: `Please answer all ${ROLE_CLARITY_QUESTION_COUNT} questions.`,
    };
  }
  // Option counts differ per question (5 for Likert, 4 for choice), so the
  // upper bound is per-question rather than a single constant.
  for (let i = 0; i < ROLE_CLARITY_QUESTION_COUNT; i++) {
    const v = answers[i];
    const max = optionCount(QUESTIONS[i]) - 1;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > max) {
      return { ok: false, error: `Invalid answer for question ${i + 1}.` };
    }
  }

  const result = scoreRoleClarity(answers);

  const responsePayload: AssessmentResponseInsert = {
    profile_id: user.id,
    assessment_id: ROLE_CLARITY_ASSESSMENT_ID,
    responses: answers,
    score: result.normalised,
    result: result as unknown as AssessmentResponseInsert["result"],
    archetype: result.band.label,
    completed_at: new Date().toISOString(),
  };

  const { error: respErr } = await supabase
    .from("assessment_responses")
    .upsert(responsePayload, { onConflict: "profile_id,assessment_id" });
  if (respErr) {
    console.error("[submitRoleClarity] assessment_responses upsert:", respErr);
    return { ok: false, error: respErr.message };
  }

  // Only role_clarity_score — the Blueprint owns the other dimensions, so a
  // partial upsert here must not blank them.
  const scoresPayload: CandidateScoresInsert = {
    profile_id: user.id,
    role_clarity_score: result.normalised,
    updated_at: new Date().toISOString(),
  };

  const { error: scoreErr } = await supabase
    .from("candidate_scores")
    .upsert(scoresPayload, { onConflict: "profile_id" });
  if (scoreErr) {
    console.error("[submitRoleClarity] candidate_scores upsert:", scoreErr);
    return { ok: false, error: scoreErr.message };
  }

  await createNotification({
    profileId: user.id,
    type: "assessment_complete",
    title: "Role Clarity results ready",
    body: `${result.band.label} — ${result.overall}/78.`,
    href: "/assessments/role-clarity",
    metadata: { score: result.normalised, band: result.band.key },
  });

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/assessments");
  revalidatePath("/assessments/role-clarity");

  return { ok: true, result };
}
