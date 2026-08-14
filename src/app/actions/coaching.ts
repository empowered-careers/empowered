"use server";

import { revalidatePath } from "next/cache";

import { fireEnrollmentCompleted } from "@/lib/loops/client";
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

  // Course finished → book the related coach. Per the brief this is the single
  // highest-value nudge in the new model, so it fires here rather than waiting
  // for a sweep. Fire-and-forget: a Loops failure must not fail the save.
  if (clamped === 100) {
    const { data } = await supabase
      .from("enrollments")
      .select("profile:profiles(email), product:coaching_products(name)")
      .eq("id", enrollmentId)
      .maybeSingle();
    const profile = Array.isArray(data?.profile)
      ? data.profile[0]
      : data?.profile;
    const product = Array.isArray(data?.product)
      ? data.product[0]
      : data?.product;
    if (profile?.email && product?.name) {
      await fireEnrollmentCompleted({
        email: profile.email,
        productName: product.name,
      });
    }
  }

  revalidatePath("/content");
  return { ok: true };
}
