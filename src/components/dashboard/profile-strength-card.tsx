"use client";

import {
  ArrowRight,
  ClipboardList,
  FileText,
  Linkedin,
  Sparkles,
  Star,
  User,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ComponentType,
  type FormEvent,
  useId,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import { updateLinkedInUrl } from "@/app/actions/profile";
import { scoreToLetterGrade } from "@/components/linkedin/grade";
import { LinkedInPdfUpload } from "@/components/linkedin/linkedin-pdf-upload";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type {
  DashboardBlueprint,
  DashboardProfile,
  DashboardResume,
} from "@/hooks/use-dashboard-data";
import { getProfileStrength } from "@/hooks/use-dashboard-data";
import {
  buildProfileSteps,
  type ProfileStep,
  type ProfileStepId,
} from "@/lib/dashboard/steps";

interface ProfileStrengthHeroProps {
  profile: DashboardProfile | null;
  resumes: DashboardResume[];
  blueprint?: DashboardBlueprint | null;
  linkedinScore?: number | null;
}

const STEP_ICONS: Record<
  ProfileStepId,
  ComponentType<{ className?: string }>
> = {
  "step-name": User,
  "step-linkedin": Linkedin,
  "step-resume": FileText,
  "step-resume-score": Star,
  "step-preferences": ClipboardList,
  "step-blueprint": Sparkles,
  "step-subscription": UserCheck,
};

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function ProfileStrengthHero({
  profile,
  resumes,
  blueprint,
  linkedinScore,
}: ProfileStrengthHeroProps) {
  const router = useRouter();
  const { user } = useAuth();
  const formId = useId();
  const [linkedinDialogOpen, setLinkedinDialogOpen] = useState(false);
  const [linkedinUrlInput, setLinkedinUrlInput] = useState("");
  const [linkedinFormError, setLinkedinFormError] = useState<string | null>(
    null
  );
  const [isSavingLinkedin, startLinkedinTransition] = useTransition();

  const hasBlueprint = !!blueprint;
  const { percentage } = getProfileStrength(profile, resumes, hasBlueprint);
  const steps = buildProfileSteps(profile, resumes, hasBlueprint);
  const nextActions = steps.filter((s) => !s.complete).slice(0, 3);

  const strokeDashoffset =
    RING_CIRCUMFERENCE * (1 - Math.min(Math.max(percentage, 0), 100) / 100);

  const openLinkedinDialog = () => {
    setLinkedinFormError(null);
    setLinkedinUrlInput(profile?.linkedin_url ?? "");
    setLinkedinDialogOpen(true);
  };

  const handleStepClick = (step: ProfileStep) => {
    if (step.id === "step-linkedin") {
      openLinkedinDialog();
      return;
    }
    if (step.href) {
      router.push(step.href);
    }
  };

  const handleLinkedinSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLinkedinFormError(null);
    startLinkedinTransition(async () => {
      const result = await updateLinkedInUrl(linkedinUrlInput);
      if (!result.success) {
        setLinkedinFormError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("LinkedIn profile URL saved.");
      setLinkedinDialogOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col border border-border bg-card">
      <div className="flex-1 p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Profile completeness
          </p>
          {profile?.linkedin_url && linkedinScore != null && (
            <span className="inline-flex items-center gap-1.5 border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
              <Linkedin className="h-3 w-3" />
              <span className="font-semibold text-foreground">
                {scoreToLetterGrade(linkedinScore)}
              </span>
              <span>{linkedinScore}/100</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-[auto_1fr]">
          {/* Ring */}
          <div className="relative h-24 w-24">
            <svg
              className="h-24 w-24 -rotate-90"
              viewBox="0 0 96 96"
              aria-hidden
            >
              <circle
                cx="48"
                cy="48"
                r={RING_RADIUS}
                fill="none"
                stroke="var(--border)"
                strokeWidth="6"
              />
              <circle
                cx="48"
                cy="48"
                r={RING_RADIUS}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="6"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 700ms ease" }}
              />
            </svg>
            <div
              className="absolute inset-0 flex items-center justify-center font-display text-3xl font-medium text-foreground"
              role="progressbar"
              aria-valuenow={percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {percentage}
            </div>
          </div>

          {/* Next actions */}
          <div className="flex flex-col gap-2">
            {nextActions.length === 0 ? (
              <div className="flex h-full items-center text-sm text-muted-foreground">
                Profile complete. New nudges will appear here as roles unlock.
              </div>
            ) : (
              nextActions.map((step) => {
                const Icon = STEP_ICONS[step.id];
                return (
                  <button
                    key={step.id}
                    type="button"
                    id={`hero-${step.id}`}
                    onClick={() => handleStepClick(step)}
                    className="group flex items-center gap-3 border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-accent"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-accent/15 text-accent-foreground dark:text-accent">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 text-[13px] leading-snug">
                      <span className="font-semibold text-foreground">
                        {step.title}
                      </span>
                      <span className="text-muted-foreground">
                        {" · "}
                        {step.unlocks}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                      +{step.points}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <Dialog
        onOpenChange={(open) => {
          setLinkedinDialogOpen(open);
          if (!open) {
            setLinkedinFormError(null);
          }
        }}
        open={linkedinDialogOpen}
      >
        <DialogContent aria-describedby={`${formId}-linkedin-desc`}>
          <DialogHeader>
            <DialogTitle>Add LinkedIn profile URL</DialogTitle>
            <DialogDescription id={`${formId}-linkedin-desc`}>
              Paste your public profile link (e.g.{" "}
              <span className="whitespace-nowrap font-mono text-xs">
                linkedin.com/in/your-handle
              </span>
              ).
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleLinkedinSubmit}>
            <div className="space-y-2">
              <label
                className="font-medium text-sm text-foreground"
                htmlFor={`${formId}-linkedin-url`}
              >
                Profile URL
              </label>
              <Input
                autoComplete="url"
                className={linkedinFormError ? "border-destructive" : undefined}
                disabled={isSavingLinkedin}
                id={`${formId}-linkedin-url`}
                name="linkedin_url"
                onChange={(ev) => setLinkedinUrlInput(ev.target.value)}
                placeholder="https://www.linkedin.com/in/your-handle"
                type="url"
                value={linkedinUrlInput}
              />
              {linkedinFormError ? (
                <p className="text-destructive text-xs" role="alert">
                  {linkedinFormError}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                disabled={isSavingLinkedin}
                onClick={() => setLinkedinDialogOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={isSavingLinkedin} type="submit">
                {isSavingLinkedin ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* LinkedIn PDF export upload — unlocks profile scoring */}
      {profile?.linkedin_url && user?.id && (
        <div className="border-t border-border px-6 py-5">
          <div className="mb-2 flex items-center gap-2">
            <Linkedin className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Score your LinkedIn profile
            </h3>
          </div>
          <LinkedInPdfUpload userId={user.id} />
        </div>
      )}
    </div>
  );
}
