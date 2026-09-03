import { redirect } from "next/navigation";

import { InviteClient } from "@/components/invite/invite-client";
import { hasAnyEnrollment } from "@/lib/coaching";
import { needsPurchase, purchaseGateEnabled } from "@/lib/purchase-gate";
import { createClient } from "@/lib/supabase/server";

import { env } from "../../../env";

export const metadata = {
  title: "Private Beta | Empowered Careers",
  robots: { index: false },
};

// Must evaluate at request time: the gate check reads PURCHASE_GATE_ENABLED,
// the user's session, and their enrollments. Without this, an env-unset build
// bakes in the /dashboard redirect at prerender and the gate can never
// activate.
export const dynamic = "force-dynamic";

/**
 * Where the (app) purchase gate sends candidates who own nothing yet.
 *
 * Two ways out: redeem the beta invite code (a comp "Beta Access" enrollment),
 * or buy something. The same code string is also a 100%-off Stripe promotion
 * code, so a tester who'd rather run the real checkout gets the same result
 * through the webhook. Either way the entitlement lands in `enrollments` — the
 * one thing the gate reads.
 */
export default async function InvitePage() {
  if (!purchaseGateEnabled()) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Bounce anyone the gate wouldn't have stopped, so this page can't trap
  // admins or people who already own something.
  if (
    !needsPurchase({
      enabled: true,
      isAdmin: profile?.role === "admin",
      hasEnrollment: await hasAnyEnrollment(user.id),
    })
  ) {
    redirect("/dashboard");
  }

  return (
    <InviteClient codeRedeemable={Boolean(env.BETA_INVITE_CODE?.trim())} />
  );
}
