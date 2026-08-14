import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { reconcileLeadForUser } from "@/lib/leads-reconcile";
import { syncLinkedInProfileUrlFromSession } from "@/lib/linkedin-identity-sync";
import { fireCandidateSignup } from "@/lib/loops/client";

/**
 * OAuth & Password-Reset callback handler.
 *
 * Handles two cases:
 * 1. OAuth sign-in: exchanges the `code` param for a Supabase session → /dashboard
 * 2. Password recovery: detects `type=recovery` → /reset-password
 *    (Supabase also fires the PASSWORD_RECOVERY auth event client-side)
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin;

  // Password-reset recovery redirect (no code exchange needed server-side;
  // Supabase handles it client-side via the PASSWORD_RECOVERY event).
  if (type === "recovery") {
    return NextResponse.redirect(`${siteUrl}/reset-password`);
  }

  if (code) {
    const cookieStore = await cookies();

    const supabase = createSupabaseServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const provider = session?.user.app_metadata?.provider as
        | string
        | undefined;
      const providers = session?.user.app_metadata?.providers as
        | string[]
        | undefined;
      const isLinkedIn =
        provider === "linkedin_oidc" ||
        (Array.isArray(providers) && providers.includes("linkedin_oidc"));

      if (isLinkedIn) {
        try {
          await syncLinkedInProfileUrlFromSession(supabase);
        } catch {
          // Non-fatal: user can add LinkedIn URL manually from the dashboard.
        }
      }

      // Lead reconciliation — match the new signup's email to a pending
      // leads row (from a webinar registration) and stamp acquisition data
      // onto the profile. Non-blocking: never fail the OAuth redirect on a
      // reconciliation error.
      if (session?.user) {
        try {
          await reconcileLeadForUser(supabase, {
            id: session.user.id,
            email: session.user.email ?? null,
          });
        } catch {
          // swallow — acquisition attribution is best-effort.
        }
      }

      // Route by role: admins to the console, employers to their portal,
      // everyone else to the candidate dashboard.
      let destination = "/dashboard";
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name, created_at, acquisition_source")
          .eq("id", session.user.id)
          .single();
        if (profile?.role === "admin") destination = "/admin";
        else if (profile?.role === "employer") destination = "/employer";

        // Loops `candidate.signup`, first sign-in only. This callback runs on
        // every OAuth sign-in, so we gate on how old the profile row is — the
        // `handle_new_user` trigger creates it at signup.
        //
        // ponytail: a 2-minute window instead of a `signup_fired_at` column. The
        // only false positive is signing in again within two minutes of signing
        // up. Add the column if the sequence starts double-firing for real.
        const isFreshSignup =
          profile?.created_at != null &&
          Date.now() - new Date(profile.created_at).getTime() < 120_000;
        if (
          isFreshSignup &&
          profile?.role === "candidate" &&
          session.user.email
        ) {
          await fireCandidateSignup({
            email: session.user.email,
            firstName: profile.full_name,
            source: profile.acquisition_source,
          });
        }
      }

      return NextResponse.redirect(`${siteUrl}${destination}`);
    }

    // Exchange failed — redirect back to login with an error hint
    return NextResponse.redirect(`${siteUrl}/login?error=oauth_error`);
  }

  // No code and no type — fallback to login
  return NextResponse.redirect(`${siteUrl}/login`);
}
