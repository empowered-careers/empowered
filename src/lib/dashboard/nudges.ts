import type {
  DashboardBlueprint,
  DashboardProfile,
  DashboardResume,
} from "@/hooks/use-dashboard-data";
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

export interface ComputeNudgesInput {
  profile: DashboardProfile | null;
  resumes: DashboardResume[];
  blueprint: DashboardBlueprint | null;
  activeJobCount: number;
  interviewingApplication: InterviewingApplication | null;
}

export function computeNudges(input: ComputeNudgesInput): Nudge[] {
  const {
    profile,
    resumes,
    blueprint,
    activeJobCount,
    interviewingApplication,
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

  const isFree =
    !profile ||
    profile.plan === "free" ||
    profile.subscription_status !== "active";
  if (isFree && activeJobCount > 0) {
    nudges.push({
      id: "nudge-plan",
      tag: "Plan",
      title: `${activeJobCount} curated roles waiting`,
      body: "Activate membership to view employer details and apply.",
      cta: { label: "See plans", href: "/pricing" },
      priority: 60,
    });
  } else if (!interviewingApplication) {
    nudges.push({
      id: "nudge-content",
      tag: "Content",
      title: "What VPs of Eng look for in 2026",
      body: "Fresh from the team — 8 min read tuned to senior tech roles.",
      cta: { label: "Read", href: "/insights" },
      priority: 40,
    });
  }

  // Resume scoring below the recruiter bar — surface a review CTA.
  // CTA points at /resume for now; retarget to the dedicated review flow
  // once Sprint E (coaching delivery) lands.
  const scoredResume = resumes.find((r) => r.resume_score !== null);
  const latestResumeScore = scoredResume?.resume_score ?? null;
  if (latestResumeScore !== null && latestResumeScore < 70) {
    nudges.push({
      id: "nudge-resume-score",
      tag: "Resume",
      title: "Your resume scores below the bar",
      body: `At ${latestResumeScore}/100, recruiters may pass. A quick review can lift it.`,
      cta: { label: "Improve resume", href: "/resume" },
      priority: 75,
    });
  }

  return nudges.sort((a, b) => b.priority - a.priority).slice(0, 3);
}
