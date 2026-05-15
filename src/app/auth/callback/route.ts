import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest,NextResponse } from "next/server";

import { syncLinkedInProfileUrlFromSession } from "@/lib/linkedin-identity-sync";

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
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin;

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

      return NextResponse.redirect(`${siteUrl}/dashboard`);
    }

    // Exchange failed — redirect back to login with an error hint
    return NextResponse.redirect(
      `${siteUrl}/login?error=oauth_error`
    );
  }

  // No code and no type — fallback to login
  return NextResponse.redirect(`${siteUrl}/login`);
}
