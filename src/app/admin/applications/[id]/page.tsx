import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicationStatusMover } from "@/components/admin/application-status-mover";
import { MarkAsPlacedDialog } from "@/components/admin/mark-as-placed-dialog";
import { tierLabel } from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, JobTier } from "@/types/db";

export const metadata = {
  title: "Admin · Application",
  robots: { index: false, follow: false },
};

interface StatusLogEntry {
  status: ApplicationStatus;
  at: string;
  by: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminApplicationDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: app } = await supabase
    .from("applications")
    .select(
      "id, status, status_log, internal_notes, created_at, updated_at, candidate:profiles!applications_profile_id_fkey(id, full_name, email), job:jobs(id, title, company_name, job_tier, submitted_by, salary_min, salary_max)"
    )
    .eq("id", id)
    .single();

  if (!app) notFound();

  const candidate = Array.isArray(app.candidate)
    ? app.candidate[0]
    : app.candidate;
  const job = Array.isArray(app.job) ? app.job[0] : app.job;
  const log = Array.isArray(app.status_log)
    ? (app.status_log as unknown as StatusLogEntry[])
    : [];

  const isPlaced = app.status === "placed";

  return (
    <div className="space-y-8 px-10 py-8">
      <section>
        <Link
          className="text-muted-foreground text-xs hover:text-foreground"
          href="/admin/applications"
        >
          ← Pipeline
        </Link>
        <h1 className="mt-2 font-display font-medium text-2xl tracking-tight">
          Application
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Created {formatDateTime(app.created_at)} · Updated{" "}
          {formatDateTime(app.updated_at)}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="border border-border bg-card p-5">
          <h2 className="text-muted-foreground text-xs uppercase tracking-wide">
            Candidate
          </h2>
          {candidate ? (
            <Link
              className="mt-2 block font-medium text-lg hover:text-accent"
              href={`/admin/candidates/${candidate.id}`}
            >
              {candidate.full_name ?? candidate.email}
            </Link>
          ) : (
            <p className="mt-2 text-muted-foreground text-sm">—</p>
          )}
          {candidate && (
            <p className="text-muted-foreground text-sm">{candidate.email}</p>
          )}
        </div>

        <div className="border border-border bg-card p-5">
          <h2 className="text-muted-foreground text-xs uppercase tracking-wide">
            Role
          </h2>
          {job ? (
            <Link
              className="mt-2 block font-medium text-lg hover:text-accent"
              href={`/admin/jobs/${job.id}/edit`}
            >
              {job.title}
            </Link>
          ) : (
            <p className="mt-2 text-muted-foreground text-sm">—</p>
          )}
          {job && (
            <p className="text-muted-foreground text-sm">
              {job.company_name} · {tierLabel[job.job_tier as JobTier]}
            </p>
          )}
        </div>
      </section>

      <section className="border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-sm">Current status</h2>
            <p className="mt-0.5 text-muted-foreground text-xs">
              Move through the pipeline. Candidate sees changes via realtime.
            </p>
          </div>
          <ApplicationStatusMover
            applicationId={app.id}
            currentStatus={app.status}
          />
        </div>
      </section>

      {!isPlaced && job && (
        <section className="border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium text-sm">Convert to placement</h2>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Creates the placement row. If the employer is an agency partner,
                a commission row is added at the configured rate.
              </p>
            </div>
            <MarkAsPlacedDialog
              applicationId={app.id}
              salaryHintMax={job.salary_max ?? null}
              salaryHintMin={job.salary_min ?? null}
            />
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-medium text-sm">Status log</h2>
        {log.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No transitions logged yet.
          </p>
        ) : (
          <ol className="space-y-2 border-l border-border pl-4">
            {[...log].reverse().map((entry, i) => (
              <li className="text-sm" key={`${entry.at}-${i}`}>
                <span className="font-medium capitalize">{entry.status}</span>
                <span className="ml-2 text-muted-foreground text-xs">
                  {formatDateTime(entry.at)} · by {entry.by.slice(0, 8)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
