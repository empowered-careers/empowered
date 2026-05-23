import Link from "next/link";
import { notFound } from "next/navigation";

import { InternalNotesEditor } from "@/components/admin/internal-notes-editor";
import { planLabel, tierLabel } from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import type { JobTier, Plan } from "@/types/db";

export const metadata = {
  title: "Admin · Candidate",
  robots: { index: false, follow: false },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCandidateDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, plan, subscription_status, billing_cadence, linkedin_url, created_at, internal_notes"
    )
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const [
    { data: resume },
    { data: linkedin },
    { data: scores },
    { data: applications },
    { data: payments },
    { count: assessmentCount },
  ] = await Promise.all([
    supabase
      .from("resumes")
      .select(
        "id, file_name, uploaded_at, resume_score, status, seniority_level, total_years_exp"
      )
      .eq("profile_id", id)
      .eq("is_current", true)
      .maybeSingle(),
    supabase
      .from("linkedin_profiles")
      .select("headline, profile_score, status, synced_at, summary")
      .eq("profile_id", id)
      .maybeSingle(),
    supabase
      .from("candidate_scores")
      .select(
        "overall_score, role_clarity_score, communication_score, leadership_score, strengths_score, impact_score, values_score, mindset_score, updated_at"
      )
      .eq("profile_id", id)
      .maybeSingle(),
    supabase
      .from("applications")
      .select(
        "id, status, created_at, updated_at, job:jobs(id, title, company_name, job_tier)"
      )
      .eq("profile_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, amount, product_type, status, created_at")
      .eq("profile_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("assessment_responses")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", id),
  ]);

  return (
    <div className="space-y-10 px-10 py-8">
      <section>
        <Link
          className="text-muted-foreground text-xs hover:text-foreground"
          href="/admin/candidates"
        >
          ← All candidates
        </Link>
        <h1 className="mt-2 font-display font-medium text-2xl tracking-tight">
          {profile.full_name ?? profile.email}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {profile.email}
          {profile.phone ? ` · ${profile.phone}` : ""} · Joined{" "}
          {formatDate(profile.created_at)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="border border-border bg-card px-2 py-1">
            {planLabel[profile.plan as Plan]} · {profile.subscription_status}
            {profile.billing_cadence ? ` · ${profile.billing_cadence}` : ""}
          </span>
          {profile.linkedin_url && (
            <a
              className="border border-border bg-card px-2 py-1 hover:text-accent"
              href={profile.linkedin_url}
              rel="noreferrer"
              target="_blank"
            >
              LinkedIn ↗
            </a>
          )}
          <span className="border border-border bg-card px-2 py-1">
            {assessmentCount ?? 0} assessment
            {assessmentCount === 1 ? "" : "s"}
          </span>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="border border-border bg-card p-5">
          <h2 className="font-medium text-sm">Resume</h2>
          {resume ? (
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">File</dt>
                <dd>{resume.file_name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Uploaded</dt>
                <dd>{formatDate(resume.uploaded_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="capitalize">{resume.status}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Resume score</dt>
                <dd>{resume.resume_score ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Seniority</dt>
                <dd>{resume.seniority_level ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Years exp.</dt>
                <dd>{resume.total_years_exp ?? "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-muted-foreground text-sm">
              No resume uploaded.
            </p>
          )}
        </div>

        <div className="border border-border bg-card p-5">
          <h2 className="font-medium text-sm">LinkedIn</h2>
          {linkedin ? (
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Headline</dt>
                <dd className="text-right">{linkedin.headline ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Sync status</dt>
                <dd className="capitalize">{linkedin.status}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Last synced</dt>
                <dd>{formatDate(linkedin.synced_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Profile score</dt>
                <dd>{linkedin.profile_score ?? "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-muted-foreground text-sm">
              No LinkedIn profile synced.
            </p>
          )}
        </div>
      </section>

      <section className="border border-border bg-card p-5">
        <h2 className="font-medium text-sm">Scores</h2>
        {scores ? (
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm md:grid-cols-4">
            {(
              [
                ["Overall", scores.overall_score],
                ["Role clarity", scores.role_clarity_score],
                ["Communication", scores.communication_score],
                ["Leadership", scores.leadership_score],
                ["Strengths", scores.strengths_score],
                ["Impact", scores.impact_score],
                ["Values", scores.values_score],
                ["Mindset", scores.mindset_score],
              ] as const
            ).map(([label, value]) => (
              <div className="flex justify-between gap-2" key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd>{value ?? "—"}</dd>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-muted-foreground text-sm">
            No assessment scores yet.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">
          Applications ({applications?.length ?? 0})
        </h2>
        <div className="overflow-hidden border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Tier</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Applied</th>
              </tr>
            </thead>
            <tbody>
              {(applications ?? []).map((app) => {
                const job = Array.isArray(app.job) ? app.job[0] : app.job;
                return (
                  <tr className="border-t border-border" key={app.id}>
                    <td className="px-4 py-2">{job?.title ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {job?.company_name ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      {job ? tierLabel[job.job_tier as JobTier] : "—"}
                    </td>
                    <td className="px-4 py-2 capitalize text-muted-foreground">
                      {app.status}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatDate(app.created_at)}
                    </td>
                  </tr>
                );
              })}
              {(!applications || applications.length === 0) && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    No applications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">
          Payments ({payments?.length ?? 0})
        </h2>
        <div className="overflow-hidden border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p) => (
                <tr className="border-t border-border" key={p.id}>
                  <td className="px-4 py-2 capitalize">{p.product_type}</td>
                  <td className="px-4 py-2">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-2 capitalize text-muted-foreground">
                    {p.status}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {formatDate(p.created_at)}
                  </td>
                </tr>
              ))}
              {(!payments || payments.length === 0) && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-muted-foreground"
                    colSpan={4}
                  >
                    No payments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">Internal notes</h2>
        <InternalNotesEditor
          initialNotes={profile.internal_notes ?? ""}
          profileId={profile.id}
        />
      </section>
    </div>
  );
}
