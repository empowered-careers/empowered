import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getJdQuota } from "@/app/actions/jd";
import { JdMatchClient } from "@/components/jd/jd-match-client";
import { createClient } from "@/lib/supabase/server";
import { JD_LIST_COLUMNS, type JdListFields } from "@/types/db";

export const metadata: Metadata = {
  title: "JD Match | Empowered Careers",
  robots: "noindex, nofollow",
};

export default async function JdMatchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: jds }, { data: resume }, quota] = await Promise.all([
    supabase
      .from("jds")
      .select(JD_LIST_COLUMNS)
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("resumes")
      .select("id")
      .eq("profile_id", user.id)
      .eq("is_current", true)
      .eq("status", "complete")
      .maybeSingle(),
    getJdQuota(),
  ]);

  return (
    <div className="px-10 py-8">
      <JdMatchClient
        hasResume={Boolean(resume)}
        jds={(jds as JdListFields[]) ?? []}
        quota={{
          used: quota.used,
          remaining: Number.isFinite(quota.remaining) ? quota.remaining : null,
          unlimited: quota.unlimited,
          exhausted: quota.exhausted,
        }}
      />
    </div>
  );
}
