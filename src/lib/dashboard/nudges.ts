import type {
  DashboardBlueprint,
  DashboardProfile,
  DashboardResume,
} from "@/hooks/use-dashboard-data";
import type { Prescription } from "@/lib/dashboard/prescribe";
import { buildProfileSteps } from "@/lib/dashboard/steps";

export interface InterviewingApplication {
  id: string;
  updated_at: string;
  job: {
    id: string;
    title: string | null;
    company_name: string | null;
  } | null;
}

export interface Nudge {
  id: string;
  tag: string;
  title: string;
  body: string;
  cta: { label: string; href: string } | null;
  priority: number;
}

/** An active enrollment the candidate has not started. */
export interface StaleEnrollment {
  productId: string;
  productName: string;
  grantedAt: string;
}

export interface ComputeNudgesInput {
  profile: DashboardProfile | null;
  resumes: DashboardResume[];
  blueprint: DashboardBlueprint | null;
  interviewingApplication: InterviewingApplication | null;
  /** Best next product from the rules engine — see `prescribe.ts`. */
  prescription?: Prescription | null;
  /** Bought but untouched for a week; the highest-value re-engagement we have. */
  staleEnrollment?: StaleEnrollment | null;
}

export function computeNudges(input: ComputeNudgesInput): Nudge[] {
  const {
    profile,
    resumes,
    blueprint,
    interviewingApplication,
    prescription = null,
    staleEnrollment = null,
  } = input;
  const nudges: Nudge[] = [];

  if (interviewingApplication) {
    const company = interviewingApplication.job?.company_name ?? "an employer";
    const title = interviewingApplication.job?.title ?? "an open role";
    nudges.push({
      id: "nudge-interviewing",
      tag: "Pipeline · Interviewing",
      title: `Interview in progress with ${company}`,
      body: `Track your ${title} application and prep notes from your pipeline.`,
      cta: { label: "View interview", href: "/pipeline" },
      priority: 100,
    });
  }

  const steps = buildProfileSteps(profile, resumes, !!blueprint);
  const incomplete = steps.filter((s) => !s.complete);
  if (incomplete.length > 0) {
    const next = incomplete[0]!;
    const remaining = incomplete.length;
    nudges.push({
      id: "nudge-profile",
      tag: "Profile",
      title:
        remaining === 1
          ? `One step to a complete profile`
          : `${remaining} steps left on your profile`,
      body: `Next up: ${next.title.toLowerCase()} — ${next.unlocks}.`,
      cta: next.href
        ? { label: "Continue", href: next.href }
        : { label: "Continue", href: "/dashboard" },
      priority: 80,
    });
  }

  // Paid for it, never opened it. Outranks any upsell — selling more to someone
  // who hasn't used what they bought is how you earn a refund request.
  if (staleEnrollment) {
    nudges.push({
      id: "nudge-enrollment-stale",
      tag: "Coaching",
      title: `You haven't started ${staleEnrollment.productName}`,
      body: "It's paid for and waiting. Picking it up now is the whole point.",
      cta: { label: "Open My Coaching", href: "/content" },
      priority: 95,
    });
  }

  // `nudge-plan` (free-plan → /pricing upsell, gated on open job count) and
  // `nudge-content` (hardcoded fake article) are both gone. This is their
  // replacement: a specific product chosen from the candidate's actual scores.
  // Suppressed mid-interview — a live process outranks an upsell.
  if (prescription && !interviewingApplication) {
    nudges.push({
      id: "nudge-prescription",
      tag: "Recommended",
      title: prescription.productName,
      body: prescription.reason,
      cta: { label: "See details", href: "/pricing" },
      priority: 45,
    });
  }

  // Resume scoring below the recruiter bar. Big Wins is the self-serve fix and
  // costs nothing, so it beats sending them straight at the paid catalog — the
  // prescription nudge above already covers the paid path.
  const scoredResume = resumes.find((r) => r.resume_score !== null);
  const latestResumeScore = scoredResume?.resume_score ?? null;
  if (latestResumeScore !== null && latestResumeScore < 70) {
    nudges.push({
      id: "nudge-resume-score",
      tag: "Resume",
      title: "Your resume scores below the bar",
      body: `At ${latestResumeScore}/100, recruiters may pass. A quick review can lift it.`,
      cta: { label: "Rewrite my bullets", href: "/assessments/big-wins" },
      priority: 75,
    });
  }

  return nudges.sort((a, b) => b.priority - a.priority).slice(0, 3);
}
