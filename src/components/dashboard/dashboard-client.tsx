"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { JobBoardTeaser } from "@/components/dashboard/job-board-teaser";
import { ProfileStrengthCard } from "@/components/dashboard/profile-strength-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ResumeCard } from "@/components/dashboard/resume-card";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import type { DashboardProfile, DashboardResume } from "@/hooks/use-dashboard-data";

export interface DashboardClientProps {
  profile: DashboardProfile | null;
  resumes: DashboardResume[];
  activeJobCount: number;
  userEmail: string;
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

  return (
    <div className="mx-auto max-w-6xl space-y-7 py-4">
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
        <ProfileStrengthCard profile={profile} resumes={resumes} />
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
