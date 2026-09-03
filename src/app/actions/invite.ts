"use server";

import { createClient } from "@/lib/supabase/server";

import { env } from "../../../env";

export type VerifyInviteCodeResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Verifies the private-beta invite code and stamps `beta_invite_ok: true` on
 * the user's auth metadata so the (app) layout gate lets them through.
 *
 * The gate is active only while `BETA_INVITE_CODE` is set; with it unset this
 * action succeeds as a no-op so /invite can never trap anyone.
 */
export async function verifyInviteCode(
  code: string
): Promise<VerifyInviteCodeResult> {
  const expected = env.BETA_INVITE_CODE;
  if (!expected) {
    return { success: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  if (code.trim().toUpperCase() !== expected.trim().toUpperCase()) {
    return {
      success: false,
      error: "That code doesn't match. Check your invite email and try again.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    data: { beta_invite_ok: true },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
