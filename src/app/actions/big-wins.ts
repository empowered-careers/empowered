"use server";

import { revalidatePath } from "next/cache";

import {
  type BigWinsAnswers,
  type BigWinsResult,
  roleKey,
} from "@/lib/assessment/big-wins";
import { BIG_WINS_ASSESSMENT_ID } from "@/lib/assessment/constants";
import { polishWins } from "@/lib/llm/polish-wins";
import { createClient } from "@/lib/supabase/server";
import type { AssessmentResponseInsert } from "@/types/db";

export type SaveRoleResult =
  | { ok: true; key: string; bullets: string[] }
  | { ok: false; error: string };

interface SaveRoleInput {
  company: string;
  title: string;
  start: string | null;
  end: string | null;
  originalBullets: string[];
  /** This role's answers, keyed by category. */
  answers: NonNullable<BigWinsAnswers[string]>;
}

/**
 * Rewrite one role's bullets from its answers and persist both.
 *
 * Synchronous: one Anthropic call while the candidate waits on the recap
 * screen. Answers are stored alongside the result so a returning candidate
 * resumes where they left off.
 *
 * ponytail: read-modify-write of the whole result blob per role. The UI walks
 * roles one at a time so there's nothing to race with; if roles ever polish
 * concurrently, move the merge into a jsonb update in SQL.
 */
export async function saveRole(input: SaveRoleInput): Promise<SaveRoleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  if (!input.company.trim() || !input.title.trim()) {
    return { ok: false, error: "Role is missing a company or title." };
  }

  const key = roleKey(input.company, input.title);

  let bullets: string[];
  try {
    bullets = await polishWins(input);
  } catch (err) {
    console.error("[saveRole] polishWins:", err);
    return {
      ok: false,
      error:
        "We couldn't rewrite this role just now. Your answers are safe — try again.",
    };
  }

  const saved = await persist(supabase, user.id, (prev, answers) => ({
    answers: { ...answers, [key]: input.answers },
    result: {
      roles: {
        ...prev.roles,
        [key]: { bullets, polished_at: new Date().toISOString() },
      },
    },
  }));

  if (!saved.ok) return saved;
  return { ok: true, key, bullets };
}

/**
 * Overwrite one role's bullets with the candidate's own edits. No model call —
 * they've already seen the output and are correcting it.
 */
export async function editRoleBullets(
  key: string,
  bullets: string[]
): Promise<SaveRoleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const cleaned = bullets.map((b) => b.trim()).filter(Boolean);

  const saved = await persist(supabase, user.id, (prev, answers) => {
    const roles = { ...prev.roles };
    if (cleaned.length === 0) {
      // Clearing the rewrite reverts this role to its parsed resume bullets.
      delete roles[key];
    } else {
      roles[key] = { bullets: cleaned, polished_at: new Date().toISOString() };
    }
    return { answers, result: { roles } };
  });

  if (!saved.ok) return saved;
  return { ok: true, key, bullets: cleaned };
}

/** Read the current row, apply `next`, upsert it back. */
async function persist(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  next: (
    prevResult: BigWinsResult,
    prevAnswers: BigWinsAnswers
  ) => { answers: BigWinsAnswers; result: BigWinsResult }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing, error: readErr } = await supabase
    .from("assessment_responses")
    .select("responses, result")
    .eq("profile_id", userId)
    .eq("assessment_id", BIG_WINS_ASSESSMENT_ID)
    .maybeSingle();

  if (readErr) {
    console.error("[big-wins persist] read:", readErr);
    return { ok: false, error: readErr.message };
  }

  const prevResult = (existing?.result as BigWinsResult | null) ?? {
    roles: {},
  };
  const prevAnswers = (existing?.responses as BigWinsAnswers | null) ?? {};
  const { answers, result } = next(
    { roles: prevResult.roles ?? {} },
    prevAnswers
  );

  const payload: AssessmentResponseInsert = {
    profile_id: userId,
    assessment_id: BIG_WINS_ASSESSMENT_ID,
    responses: answers as unknown as AssessmentResponseInsert["responses"],
    result: result as unknown as AssessmentResponseInsert["result"],
    completed_at: new Date().toISOString(),
  };

  const { error: writeErr } = await supabase
    .from("assessment_responses")
    .upsert(payload, { onConflict: "profile_id,assessment_id" });

  if (writeErr) {
    console.error("[big-wins persist] upsert:", writeErr);
    return { ok: false, error: writeErr.message };
  }

  revalidatePath("/resume");
  revalidatePath("/assessments");
  revalidatePath("/assessments/big-wins");
  return { ok: true };
}
