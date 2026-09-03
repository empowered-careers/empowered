import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import {
  type DashboardProfile,
  type DashboardResume,
  getProfileStrength,
} from "@/hooks/use-dashboard-data";
import { hasAnyEnrollment } from "@/lib/coaching";
import { needsPurchase, purchaseGateEnabled } from "@/lib/purchase-gate";
import { createClient } from "@/lib/supabase/server";

/**
 * Authenticated app shell layout.
 *
 * 1. Server-side auth guard — redirects to /login before any UI renders.
 * 2. Fetches the minimum profile data needed to populate the pinned sidebar
 *    chip (name, completeness ring).
 * 3. Wraps every (app)/* route in <AppShell>, which provides the top nav,
 *    contextual sidebar (per pathname), and main canvas slot.
 */
export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResult, resumesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, linkedin_url, linkedin_provider_id, plan, billing_cadence, subscription_status, onboarding_completed_at, role"
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("resumes")
      .select("id, uploaded_at, resume_score, file_name")
      .eq("profile_id", user.id)
      .order("uploaded_at", { ascending: false }),
  ]);

  const profile =
    (profileResult.data as (DashboardProfile & { role?: string }) | null) ??
    null;
  const resumes = (resumesResult.data as DashboardResume[]) ?? [];

  // Employer accounts have their own portal at /employer.
  if (profile?.role === "employer") {
    redirect("/employer");
  }

  const isAdmin = profile?.role === "admin";

  // Purchase gate: active only while PURCHASE_GATE_ENABLED="true" (anything
  // else = fully inert). Entitlement is an `enrollments` row written by the
  // Stripe webhook — never auth metadata, which the user's own browser session
  // can write. Admins bypass; employers were redirected above.
  //
  // ponytail: one query, only when the gate is on. If the gate ships for real,
  // fold it into the Promise.all above.
  if (
    purchaseGateEnabled() &&
    needsPurchase({
      enabled: true,
      isAdmin,
      hasEnrollment: await hasAnyEnrollment(user.id),
    })
  ) {
    redirect("/invite");
  }

  const { percentage } = getProfileStrength(profile, resumes);

  const userName =
    profile?.full_name?.trim() || user.email?.split("@")[0] || "Member";

  return (
    <AppShell
      completeness={percentage}
      isAdmin={isAdmin}
      subline="Member"
      userEmail={user.email ?? ""}
      userName={userName}
    >
      {children}
    </AppShell>
  );
}
