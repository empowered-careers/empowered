import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { JdResult } from "@/components/jd/jd-result";
import { type JdMatch, JdMatchSchema } from "@/lib/llm/schemas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "JD Match | Empowered Careers",
  robots: "noindex, nofollow",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function JdMatchResultPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS already scopes jds to the owner; profile_id isn't in the select because
  // a row from another candidate simply isn't returned.
  const { data: jd } = await supabase
    .from("jds")
    .select("id, ats_score, gap_summary, parsed_json, status, parse_error")
    .eq("id", id)
    .maybeSingle();
  if (!jd) notFound();

  // parsed_json is whatever the model returned last; re-validate rather than
  // trusting the column's shape across prompt versions.
  const parsed = JdMatchSchema.safeParse(jd.parsed_json);
  const match: JdMatch | null = parsed.success ? parsed.data : null;

  return (
    <div className="px-10 py-8">
      <JdResult
        atsScore={jd.ats_score}
        gapSummary={jd.gap_summary}
        jdId={jd.id}
        match={match}
        parseError={jd.parse_error}
        status={jd.status}
      />
    </div>
  );
}
