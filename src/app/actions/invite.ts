"use server";

import { matchesInviteCode, purchaseGateEnabled } from "@/lib/purchase-gate";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

import { env } from "../../../env";

/**
 * The comp'd "Beta Access" product, seeded inactive by
 * 20260903010000_beta_access_product.sql. `enrollments.product_id` is NOT NULL,
 * so a code redemption needs something to enroll in.
 */
const BETA_ACCESS_PRODUCT_ID = "7c1f0a01-0000-4000-8000-0000000000b1";

export type RedeemInviteCodeResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Redeems the beta invite code (`BETA_INVITE_CODE`, e.g. ECTEST100) by granting
 * a free "Beta Access" enrollment, which is what the (app) purchase gate reads.
 *
 * The insert runs on the service-role client on purpose: candidates have no
 * INSERT policy on `enrollments` (see 20260903000000_enrollments_no_self_grant),
 * so entitlement can only ever be granted by server code that checked something
 * — here the code, in the Stripe webhook a completed payment.
 *
 * The same string also exists as a 100%-off Stripe promotion code, for testers
 * who go through real checkout instead; that path grants its enrollment through
 * the webhook and never touches this action.
 */
export async function redeemInviteCode(
  code: string
): Promise<RedeemInviteCodeResult> {
  if (!purchaseGateEnabled()) {
    // Nothing to unlock — the gate is off, so /invite is unreachable anyway.
    return { success: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  if (!matchesInviteCode(code, env.BETA_INVITE_CODE)) {
    return {
      success: false,
      error: "That code doesn't match. Check your invite email and try again.",
    };
  }

  // ponytail: no rate limit on attempts. The code is a beta speed bump, not a
  // secret; add one here if it ever guards something worth guessing at.
  const { error } = await createServiceClient()
    .from("enrollments")
    .upsert(
      {
        profile_id: user.id,
        product_id: BETA_ACCESS_PRODUCT_ID,
        status: "active" as const,
      },
      { onConflict: "profile_id,product_id", ignoreDuplicates: true }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
