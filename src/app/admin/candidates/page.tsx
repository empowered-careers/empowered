import { CandidatesTable } from "@/components/admin/candidates-table";
import { createClient } from "@/lib/supabase/server";
import {
  ADMIN_CANDIDATE_LIST_COLUMNS,
  type AdminCandidateListFields,
} from "@/types/db";

export const metadata = {
  title: "Admin · Candidates",
  robots: { index: false, follow: false },
};

export default async function AdminCandidatesPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select(ADMIN_CANDIDATE_LIST_COLUMNS)
    .eq("role", "candidate")
    .order("created_at", { ascending: false });

  const candidates = (data ?? []) as AdminCandidateListFields[];

  return (
    <div className="space-y-6 px-10 py-8">
      <section>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Candidates
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {candidates.length} signed up. Filter by plan, search by name or
          email.
        </p>
      </section>

      <CandidatesTable candidates={candidates} />
    </div>
  );
}
