import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type { LinkedinFullRow } from "@/components/linkedin/linkedin-client";
import { LinkedinClient } from "@/components/linkedin/linkedin-client";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "LinkedIn Grade | Empowered Careers",
  robots: "noindex, nofollow",
};

export default async function LinkedinPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResult, linkedinResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("linkedin_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("linkedin_profiles")
      .select(
        "id, linkedin_url, headline, summary, profile_score, parsed_json, status, last_export_path, sync_started_at, synced_at, sync_error"
      )
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  if (linkedinResult.error) {
    console.error("[linkedin page] fetch error:", linkedinResult.error);
  }

  const row = (linkedinResult.data as LinkedinFullRow | null) ?? null;
  const profileLinkedinUrl = profileResult.data?.linkedin_url ?? null;

  return (
    <div className="mx-auto max-w-5xl px-10 py-8">
      <LinkedinClient
        linkedin={row}
        profileLinkedinUrl={profileLinkedinUrl}
        userId={user.id}
      />
    </div>
  );
}
