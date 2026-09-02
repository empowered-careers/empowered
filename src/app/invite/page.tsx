import { redirect } from "next/navigation";

import { InviteClient } from "@/components/invite/invite-client";
import { createClient } from "@/lib/supabase/server";

import { env } from "../../../env";

export const metadata = {
  title: "Private Beta | Empowered Careers",
  robots: { index: false },
};

// Must evaluate at request time: the gate check reads BETA_INVITE_CODE and the
// user's session. Without this, an env-unset build bakes in the /dashboard
// redirect at prerender and the gate can never activate.
export const dynamic = "force-dynamic";

/**
 * Private-beta invite code gate. Server component: bounces users who don't
 * need it (gate off, not signed in, or already verified) before any UI
 * renders, per the app's server/client split convention.
 */
export default async function InvitePage() {
  if (!env.BETA_INVITE_CODE) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.user_metadata?.beta_invite_ok === true) {
    redirect("/dashboard");
  }

  return <InviteClient />;
}
