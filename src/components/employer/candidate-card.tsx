import Link from "next/link";

import type { ApplicationStatus } from "@/types/db";

export interface CandidateCardData {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
}

export interface CandidateCardResume {
  file_name: string | null;
  raw_file_url: string;
  resume_score: number | null;
  seniority_level: string | null;
  total_years_exp: number | null;
}

export interface CandidateCardScore {
  overall_score: number | null;
}

interface Props {
  candidate: CandidateCardData;
  resume: CandidateCardResume | null;
  score: CandidateCardScore | null;
  assessmentCount: number;
  applicationStatus: ApplicationStatus;
  compact?: boolean;
}

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  interested: "Interested",
  submitted: "Submitted",
  screening: "Screening",
  interviewing: "Interviewing",
  offer: "Offer",
  placed: "Placed",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/**
 * Full-PII candidate card for the employer applications view. Per the
 * recruiter-portal spec, candidates consent to share their full profile
 * (name, email, phone, LinkedIn, resume, scores) at the "Express interest"
 * confirmation step.
 */
export function CandidateCard({
  candidate,
  resume,
  score,
  assessmentCount,
  applicationStatus,
  compact = false,
}: Props) {
  return (
    <div className="border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-base">
            {candidate.full_name?.trim() || candidate.email}
          </h3>
          <p className="text-muted-foreground text-sm">{candidate.email}</p>
          {candidate.phone && (
            <p className="text-muted-foreground text-sm">{candidate.phone}</p>
          )}
        </div>
        <span className="rounded border border-border bg-background px-2 py-0.5 text-[12px] text-muted-foreground capitalize">
          {STATUS_LABEL[applicationStatus]}
        </span>
      </div>

      {!compact && (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <Field
            label="LinkedIn"
            value={
              candidate.linkedin_url ? (
                <Link
                  className="text-accent hover:underline"
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View profile
                </Link>
              ) : (
                "—"
              )
            }
          />
          <Field
            label="Resume"
            value={
              resume ? (
                <Link
                  className="text-accent hover:underline"
                  href={resume.raw_file_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {resume.file_name ?? "Download"}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <Field
            label="ATS score"
            value={
              resume?.resume_score != null ? `${resume.resume_score}/100` : "—"
            }
          />
          <Field label="Seniority" value={resume?.seniority_level ?? "—"} />
          <Field
            label="Years of experience"
            value={
              resume?.total_years_exp != null
                ? `${resume.total_years_exp} yrs`
                : "—"
            }
          />
          <Field
            label="Overall fit"
            value={
              score?.overall_score != null ? `${score.overall_score}/100` : "—"
            }
          />
          <Field label="Assessments completed" value={`${assessmentCount}`} />
        </dl>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-[11px] uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
