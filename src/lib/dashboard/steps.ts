import type {
  DashboardProfile,
  DashboardResume,
} from "@/hooks/use-dashboard-data";

export type ProfileStepId =
  | "step-name"
  | "step-linkedin"
  | "step-resume"
  | "step-resume-score"
  | "step-preferences"
  | "step-blueprint"
  | "step-role-clarity";

export interface ProfileStep {
  id: ProfileStepId;
  title: string;
  unlocks: string;
  points: number;
  href: string | null;
  complete: boolean;
}

/**
 * The seven steps that make up profile strength. `points` sum to exactly 100 —
 * keep it that way when adding a step, or the "+N" figures stop adding up to
 * the ring the card draws next to them.
 */
export function buildProfileSteps(
  profile: DashboardProfile | null,
  resumes: DashboardResume[],
  hasBlueprint: boolean,
  hasRoleClarity: boolean
): ProfileStep[] {
  const hasResume = resumes.length > 0;
  const hasResumeScore = resumes.some((r) => r.resume_score !== null);

  return [
    {
      id: "step-name",
      title: "Add your name",
      unlocks: "needed for matches",
      points: 15,
      href: "/profile",
      complete: !!profile?.full_name,
    },
    {
      id: "step-linkedin",
      title: "Add LinkedIn URL",
      unlocks: "unlocks profile scoring",
      points: 15,
      href: null,
      complete: !!profile?.linkedin_url,
    },
    {
      id: "step-resume",
      title: "Upload your resume",
      unlocks: "required for matching",
      points: 14,
      href: "/resumes",
      complete: hasResume,
    },
    {
      id: "step-resume-score",
      title: "Score your resume",
      unlocks: "see how recruiters view it",
      points: 14,
      href: "/resumes",
      complete: hasResumeScore,
    },
    {
      id: "step-preferences",
      title: "Set job preferences",
      unlocks: "tells us what you want",
      points: 14,
      href: "/onboarding/preferences",
      complete: !!profile?.onboarding_completed_at,
    },
    {
      id: "step-blueprint",
      title: "Discover your Blueprint",
      unlocks: "30-question identity scan",
      points: 14,
      href: "/assessments/ci-blueprint",
      complete: hasBlueprint,
    },
    {
      id: "step-role-clarity",
      title: "Pin down your target role",
      unlocks: "18-question role clarity scan",
      points: 14,
      href: "/assessments/role-clarity",
      complete: hasRoleClarity,
    },
  ];
}
