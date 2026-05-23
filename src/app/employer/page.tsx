import Link from "next/link";

import { requireEmployer } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Employer · Overview",
  robots: { index: false, follow: false },
};

interface TileProps {
  label: string;
  value: string | number;
  href?: string;
  sub?: string;
}

function Tile({ label, value, href, sub }: TileProps) {
  const body = (
    <div className="h-full border border-border bg-card p-5 transition-colors hover:border-accent/60">
      <div className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-2 font-display font-medium text-3xl tracking-tight">
        {value}
      </div>
      {sub && <div className="mt-1 text-muted-foreground text-xs">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function EmployerOverviewPage() {
  const { employerId, role, relationshipType } = await requireEmployer();
  const supabase = await createClient();

  // Admin impersonation: no employer scope. Show an empty-state nudge.
  if (!employerId) {
    return (
      <div className="space-y-6 px-10 py-8">
        <section>
          <h1 className="font-display font-medium text-2xl tracking-tight">
            Employer console
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            You&apos;re viewing as an admin without a linked employer row. Pick
            an employer from{" "}
            <Link
              className="underline underline-offset-2"
              href="/admin/employers"
            >
              /admin/employers
            </Link>{" "}
            to see their hiring view.
          </p>
        </section>
      </div>
    );
  }

  // RLS already scopes each table to the caller's employer; explicit
  // .eq() filters short-circuit when the caller is admin-impersonating.
  const [jobsResult, applicationsResult, placementsResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, status, client_company_id")
      .eq("submitted_by", employerId),
    supabase.from("applications").select("id, status, job_id"),
    supabase
      .from("placements")
      .select("id, status, fee_amount")
      .eq("employer_id", employerId),
  ]);

  const jobs = jobsResult.data ?? [];
  const applications = applicationsResult.data ?? [];
  const placements = placementsResult.data ?? [];

  const activeRoles = jobs.filter((j) => j.status === "active").length;

  const appCounts: Record<string, number> = {};
  for (const a of applications) {
    appCounts[a.status] = (appCounts[a.status] ?? 0) + 1;
  }
  const interestedNow =
    (appCounts.interested ?? 0) +
    (appCounts.submitted ?? 0) +
    (appCounts.screening ?? 0) +
    (appCounts.interviewing ?? 0) +
    (appCounts.offer ?? 0);

  const isAgency = relationshipType === "agency_partner";

  return (
    <div className="space-y-8 px-10 py-8">
      <section>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          {role === "admin" ? "Employer console (impersonated)" : "Overview"}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {isAgency
            ? "Roles you've posted on behalf of your clients, and candidates who've expressed interest."
            : "Your open roles and candidates who've expressed interest."}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          href="/employer/jobs"
          label="Active roles"
          sub={`${jobs.length} total · ${jobs.length - activeRoles} closed`}
          value={activeRoles}
        />
        <Tile
          href="/employer/applications"
          label="Interested candidates"
          sub={`${appCounts.offer ?? 0} at offer · ${appCounts.interviewing ?? 0} interviewing`}
          value={interestedNow}
        />
        <Tile
          href="/employer/placements"
          label="Placements"
          sub={`${placements.length} total`}
          value={placements.length}
        />
      </section>
    </div>
  );
}
