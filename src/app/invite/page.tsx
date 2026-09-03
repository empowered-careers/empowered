import Link from "next/link";
import { redirect } from "next/navigation";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasAnyEnrollment } from "@/lib/coaching";
import { needsPurchase, purchaseGateEnabled } from "@/lib/purchase-gate";
import { createClient } from "@/lib/supabase/server";

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
 * Where the (app) purchase gate sends candidates who haven't bought anything.
 *
 * There is no code to enter here: an "invite code" is a Stripe promotion code,
 * typed into Checkout's promo field (`allow_promotion_codes` is already on in
 * `api/stripe/checkout`), and a 100%-off coupon grants the enrollment through
 * the normal webhook. That keeps one entitlement path — `enrollments` — instead
 * of a second, self-writable one.
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
    <PageShell>
      <div className="flex justify-center pt-16">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-3xl">Private Beta</CardTitle>
            <CardDescription>
              Empowered Careers is in private beta. Access comes with your first
              purchase — pick anything from the catalog to unlock your
              dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Have an invite code? Enter it in the promotion code field at
              checkout.
            </p>
            <Button asChild className="w-full">
              <Link href="/pricing">See what&apos;s available</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
