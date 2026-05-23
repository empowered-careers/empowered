import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type { ResumeFullRow } from "@/components/resume/resume-client";
import { ResumeClient } from "@/components/resume/resume-client";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Resume | Empowered Careers",
  robots: "noindex, nofollow",
};

export default async function ResumePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("resumes")
    .select(
      "id, file_name, raw_file_url, resume_score, parsed_json, status, uploaded_at, parsed_at, parse_error, is_current, seniority_level, total_years_exp"
    )
    .eq("profile_id", user.id)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("[resume page] fetch error:", error);
  }

  const resumes = (data as ResumeFullRow[]) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-10 py-8">
      <ResumeClient resumes={resumes} userId={user.id} />
    </div>
  );
}
