"use server";

import { revalidatePath } from "next/cache";

import { inngest, JdSubmittedEvent } from "@/inngest/client";
import { monthStartIso, quotaState } from "@/lib/jd-quota";
import { createClient } from "@/lib/supabase/server";

export type SubmitJdResult =
  | { ok: true; jdId: string }
  | { ok: false; error: string; quotaExhausted?: boolean };

/** Enough text to be a posting rather than a stray paste. */
const MIN_JD_CHARS = 120;
/** Guards the token bill and the `raw_text` column. ~25k words is a long JD. */
const MAX_JD_CHARS = 40_000;

/**
 * Read the candidate's JD quota. Anyone holding an active enrollment is
 * unlimited; everyone else gets `FREE_JD_PER_MONTH` per calendar month.
 *
 * Entitlement comes from `enrollments`, never `profiles.plan` (CLAUDE.md rule 2).
 */
export async function getJdQuota(): Promise<{
  used: number;
  remaining: number;
  unlimited: boolean;
  exhausted: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { used: 0, remaining: 0, unlimited: false, exhausted: true };
  }

  const [{ count }, { data: enrollment }] = await Promise.all([
    supabase
      .from("jds")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .eq("source", "free")
      .gte("created_at", monthStartIso(new Date())),
    supabase
      .from("enrollments")
      .select("id")
      .eq("profile_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
  ]);

  const unlimited = Boolean(enrollment);
  const state = quotaState(count ?? 0, unlimited);
  return {
    used: state.used,
    remaining: unlimited ? Number.POSITIVE_INFINITY : state.remaining,
    unlimited,
    exhausted: state.exhausted,
  };
}

/**
 * Create a `jds` row from pasted text and kick off the ATS match.
 *
 * ponytail: paste-only. The brief allows PDF/docx upload too, but that needs a
 * new storage bucket, MIME validation, a content hash and a download step in the
 * worker — real cost for the rarer path, when a JD is nearly always copy-pasted
 * from a posting. `jds.file_path` exists for when upload is added; nothing else
 * has to change.
 */
export async function submitJd(rawText: string): Promise<SubmitJdResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const text = rawText.trim();
  if (text.length < MIN_JD_CHARS) {
    return {
      ok: false,
      error: "That looks too short — paste the whole job description.",
    };
  }
  if (text.length > MAX_JD_CHARS) {
    return {
      ok: false,
      error: "That's longer than we can read. Trim it to the role itself.",
    };
  }

  // Scoring a JD against nothing produces a meaningless score, so require the
  // parsed resume rather than silently returning one.
  const { data: resume } = await supabase
    .from("resumes")
    .select("id")
    .eq("profile_id", user.id)
    .eq("is_current", true)
    .eq("status", "complete")
    .maybeSingle();
  if (!resume) {
    return {
      ok: false,
      error: "Upload and score your resume first — we match the JD against it.",
    };
  }

  const quota = await getJdQuota();
  if (quota.exhausted) {
    return {
      ok: false,
      error: "You've used your free checks for this month.",
      quotaExhausted: true,
    };
  }

  const { data: jd, error } = await supabase
    .from("jds")
    .insert({
      profile_id: user.id,
      raw_text: text,
      source: quota.unlimited ? "paid" : "free",
    })
    .select("id")
    .single();
  if (error || !jd) {
    return { ok: false, error: error?.message ?? "Could not save the JD." };
  }

  // Same posture as insertResumeRow: a send failure is reported so the UI can
  // offer a retry, rather than leaving a row stuck on 'processing' forever.
  try {
    await inngest.send(
      JdSubmittedEvent.create({ jdId: jd.id, profileId: user.id })
    );
  } catch {
    await supabase
      .from("jds")
      .update({ status: "failed", parse_error: "inngest_send_failed" })
      .eq("id", jd.id);
    return {
      ok: false,
      error: "Saved your JD, but scoring didn't start. Try again.",
    };
  }

  revalidatePath("/jd-match");
  return { ok: true, jdId: jd.id };
}

/** Re-fire the match for a row that failed. Does not consume fresh quota. */
export async function retryJd(jdId: string): Promise<SubmitJdResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: row } = await supabase
    .from("jds")
    .select("id, profile_id, status")
    .eq("id", jdId)
    .maybeSingle();
  if (!row || row.profile_id !== user.id) {
    return { ok: false, error: "Not found." };
  }
  if (row.status === "complete") return { ok: true, jdId };

  await supabase
    .from("jds")
    .update({ status: "processing", parse_error: null })
    .eq("id", jdId);

  try {
    await inngest.send(JdSubmittedEvent.create({ jdId, profileId: user.id }));
  } catch {
    return { ok: false, error: "Couldn't restart scoring. Try again." };
  }

  revalidatePath("/jd-match");
  return { ok: true, jdId };
}
