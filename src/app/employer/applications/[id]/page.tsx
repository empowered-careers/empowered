import Link from "next/link";
import { notFound } from "next/navigation";

import { EmployerApplicationStatusMover } from "@/components/employer/application-status-mover";
import {
  CandidateCard,
  type CandidateCardData,
  type CandidateCardResume,
  type CandidateCardScore,
} from "@/components/employer/candidate-card";
import { requireEmployer } from "@/lib/auth/require-role";
import { tierLabel } from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, JobTier } from "@/types/db";

export const metadata = {
  title: "Employer · Application",
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

export default async function EmployerApplicationDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const { employerId } = await requireEmployer();
  const supabase = await createClient();

  const { data: app } = await supabase
    .from("applications")
    .select(
      "id, status, status_log, created_at, updated_at, profile_id, candidate:profiles!applications_profile_id_fkey(id, full_name, email, phone, linkedin_url), job:jobs!inner(id, title, company_name, job_tier, submitted_by)"
    )
    .eq("id", id)
    .single();

  if (!app) notFound();

  const job = Array.isArray(app.job) ? app.job[0] : app.job;
  // Defense in depth — RLS already gates this row.
  if (employerId && job?.submitted_by !== employerId) {
    notFound();
  }

  const candidate = Array.isArray(app.candidate)
    ? app.candidate[0]
    : app.candidate;

  if (!candidate) notFound();

  const [{ data: resume }, { data: score }, { count: assessmentCount }] =
    await Promise.all([
      supabase
        .from("resumes")
        .select(
          "file_name, raw_file_url, resume_score, seniority_level, total_years_exp"
        )
        .eq("profile_id", app.profile_id)
        .eq("is_current", true)
        .maybeSingle(),
      supabase
        .from("candidate_scores")
        .select("overall_score")
        .eq("profile_id", app.profile_id)
        .maybeSingle(),
      supabase
        .from("assessment_responses")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", app.profile_id),
    ]);

  const log = Array.isArray(app.status_log)
    ? (app.status_log as unknown as StatusLogEntry[])
    : [];

  return (
    <div className="space-y-8 px-10 py-8">
      <section>
        <Link
          className="text-muted-foreground text-xs hover:text-foreground"
          href="/employer/applications"
        >
          ← Candidates
        </Link>
        <h1 className="mt-2 font-display font-medium text-2xl tracking-tight">
          Application
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Created {formatDateTime(app.created_at)} · Updated{" "}
          {formatDateTime(app.updated_at)}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-muted-foreground text-xs uppercase tracking-wide">
          Candidate
        </h2>
        <CandidateCard
          candidate={candidate as CandidateCardData}
          resume={(resume as CandidateCardResume | null) ?? null}
          score={(score as CandidateCardScore | null) ?? null}
          assessmentCount={assessmentCount ?? 0}
          applicationStatus={app.status as ApplicationStatus}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="border border-border bg-card p-5">
          <h2 className="text-muted-foreground text-xs uppercase tracking-wide">
            Role
          </h2>
          {job ? (
            <Link
              className="mt-2 block font-medium text-lg hover:text-accent"
              href={`/employer/jobs/${job.id}/edit`}
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

        <div className="border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium text-sm">Current status</h2>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Move through screening → offer. Marking as placed stays with
                Empowered Careers.
              </p>
            </div>
            <EmployerApplicationStatusMover
              applicationId={app.id}
              currentStatus={app.status as ApplicationStatus}
            />
          </div>
        </div>
      </section>

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
