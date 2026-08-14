"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Candidate-reported course progress. Self-reported by design — the D2 decision
 * is an unlisted video embed, which gives us no playback telemetry.
 *
 * `enrollments` RLS is `profile_id = auth.uid()`, so the ownership check is the
 * database's job; the `.eq("profile_id", user.id)` below just makes the intent
 * explicit at the call site.
 */
export async function setCourseProgress(
  enrollmentId: string,
  progress: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const clamped = Math.max(0, Math.min(100, Math.round(progress)));

  const { error } = await supabase
    .from("enrollments")
    .update({
      progress: clamped,
      // Completion is derived from progress so "done" can't drift from the bar.
      status: clamped === 100 ? "completed" : "active",
      completed_at: clamped === 100 ? new Date().toISOString() : null,
    })
    .eq("id", enrollmentId)
    .eq("profile_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/content");
  return { ok: true };
}
