"use client";

import { AlertCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { JobBoardTeaser } from "@/components/dashboard/job-board-teaser";
import { ProfileStrengthCard } from "@/components/dashboard/profile-strength-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ResumeCard } from "@/components/dashboard/resume-card";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import type {
  DashboardBlueprint,
  DashboardProfile,
  DashboardResume,
} from "@/hooks/use-dashboard-data";

export interface DashboardClientProps {
  profile: DashboardProfile | null;
  resumes: DashboardResume[];
  activeJobCount: number;
  userEmail: string;
  blueprint: DashboardBlueprint | null;
}

function scrollToResumeHub() {
  document
    .getElementById("resume-hub")
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function DashboardClient({
  profile,
  resumes,
  activeJobCount,
  userEmail,
  blueprint,
}: DashboardClientProps) {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed out successfully!");
      router.push("/");
    }
  };

  const onboardingPending = profile && !profile.onboarding_completed_at;

  return (
    <div className="mx-auto max-w-6xl space-y-7 py-4">
      {onboardingPending && (
        <div className="flex items-center gap-3 border border-yellow-500/40 bg-yellow-500/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-500" />
          <div className="flex-1 text-sm">
            <span className="font-medium text-foreground">
              Complete your profile to unlock matches
            </span>
            <span className="ml-2 text-muted-foreground">
              — takes 90 seconds.
            </span>
          </div>
          <Button asChild size="sm">
            <Link href="/onboarding/preferences">Start</Link>
          </Button>
        </div>
      )}

      {blueprint?.archetype && (
        <div className="flex items-center gap-3 border border-accent/40 bg-accent/10 px-4 py-3">
          <Sparkles className="h-4 w-4 shrink-0 text-accent" />
          <div className="flex-1 text-sm">
            <span className="font-medium text-foreground">
              You're {blueprint.archetype}
            </span>
            <span className="ml-2 text-muted-foreground">
              — your Blueprint is shaping your matches.
            </span>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/assessments/ci-blueprint">View results</Link>
          </Button>
        </div>
      )}

      {/* ── Top Section ──────────────────────────────────────────── */}
      <DashboardHeader profile={profile} userEmail={userEmail} />

      {/* ── Quick CTA bar ──────────────────────────────────────────── */}
      <QuickActions
        profile={profile}
        resumes={resumes}
        activeJobCount={activeJobCount}
        onUploadResume={scrollToResumeHub}
      />

      {/* ── 3-column cards grid ────────────────────────────────────── */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <ResumeCard resumes={resumes} />
        <ProfileStrengthCard
          profile={profile}
          resumes={resumes}
          blueprint={blueprint}
        />
        <JobBoardTeaser profile={profile} activeJobCount={activeJobCount} />
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="flex justify-end border-t border-border pt-5">
        <Button
          id="dashboard-signout-btn"
          onClick={handleSignOut}
          size="sm"
          variant="ghost"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
