import { ApplicationsKanban } from "@/components/admin/applications-kanban";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin · Pipeline",
  robots: { index: false, follow: false },
};

export default async function AdminApplicationsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("applications")
    .select(
      "id, status, created_at, updated_at, candidate:profiles!applications_profile_id_fkey(id, full_name, email), job:jobs(id, title, company_name, job_tier)"
    )
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6 px-10 py-8">
      <section>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Pipeline
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {data?.length ?? 0} application{data?.length === 1 ? "" : "s"} across
          every candidate. Move stages with the per-card status selector.
        </p>
      </section>

      <ApplicationsKanban applications={data ?? []} />
    </div>
  );
}
