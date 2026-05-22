"use client";

import {
  BarChart3,
  CheckCircle2,
  Circle,
  ExternalLink,
  Linkedin,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateLinkedInUrl } from "@/app/actions/profile";
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
  DashboardProfile,
  DashboardResume,
} from "@/hooks/use-dashboard-data";
import { getProfileStrength } from "@/hooks/use-dashboard-data";

interface ProfileStrengthCardProps {
  profile: DashboardProfile | null;
  resumes: DashboardResume[];
}

type StepStatus = "complete" | "incomplete";

interface Step {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
  action?: { label: string; href?: string; onClick?: () => void };
}

function buildSteps(
  profile: DashboardProfile | null,
  resumes: DashboardResume[]
): Step[] {
  const hasResume = resumes.length > 0;
  const hasAtsScore = resumes.some((r) => r.ats_score !== null);

  return [
    {
      id: "step-name",
      label: "Complete your profile",
      description: "Add your full name and contact details",
      status: profile?.full_name ? "complete" : "incomplete",
    },
    {
      id: "step-linkedin",
      label: "Add LinkedIn profile",
      description: "Unlock LinkedIn profile scoring",
      status: profile?.linkedin_url ? "complete" : "incomplete",
      action: profile?.linkedin_url
        ? {
            label: "View",
            href: profile.linkedin_url,
          }
        : { label: "Add URL" },
    },
    {
      id: "step-resume",
      label: "Upload resume",
      description: "Required for ATS scoring and job matching",
      status: hasResume ? "complete" : "incomplete",
    },
    {
      id: "step-ats",
      label: "Get ATS score",
      description: "Understand how recruiters see your resume",
      status: hasAtsScore ? "complete" : "incomplete",
    },
    {
      id: "step-preferences",
      label: "Job preferences",
      description: "Tell us what you're looking for",
      status: profile?.onboarding_completed_at ? "complete" : "incomplete",
      action: profile?.onboarding_completed_at ? undefined : { label: "Start" },
    },
    {
      id: "step-subscription",
      label: "Activate membership",
      description: "Access exclusive job matches",
      status:
        profile?.subscription_status === "active" ? "complete" : "incomplete",
    },
  ];
}

export function ProfileStrengthCard({
  profile,
  resumes,
}: ProfileStrengthCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const formId = useId();
  const [linkedinDialogOpen, setLinkedinDialogOpen] = useState(false);
  const [linkedinUrlInput, setLinkedinUrlInput] = useState("");
  const [linkedinFormError, setLinkedinFormError] = useState<string | null>(
    null
  );
  const [isSavingLinkedin, startLinkedinTransition] = useTransition();

  const { completed, total, percentage } = getProfileStrength(profile, resumes);
  const steps = buildSteps(profile, resumes);

  const strengthLabel =
    percentage >= 80
      ? "Strong"
      : percentage >= 60
        ? "Good"
        : percentage >= 40
          ? "Fair"
          : "Getting started";

  const barColor =
    percentage >= 80
      ? "bg-emerald-500"
      : percentage >= 60
        ? "bg-accent"
        : percentage >= 40
          ? "bg-yellow-500"
          : "bg-muted-foreground";

  const openLinkedinDialog = () => {
    setLinkedinFormError(null);
    setLinkedinUrlInput(profile?.linkedin_url ?? "");
    setLinkedinDialogOpen(true);
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
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-semibold text-foreground">
          Profile Strength
        </h2>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Score summary */}
        <div className="mb-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {strengthLabel}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {completed} of {total} steps
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden bg-muted">
            <div
              id="profile-strength-bar"
              className={`h-full transition-all duration-700 ${barColor}`}
              style={{ width: `${percentage}%` }}
              role="progressbar"
              aria-valuenow={percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          {/* Score chips */}
          {profile?.linkedin_url && (
            <div className="flex gap-2 pt-1">
              <div className="flex items-center gap-1 border border-border bg-muted px-2 py-1">
                <Linkedin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  LinkedIn connected
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Steps */}
        <ul className="space-y-3">
          {steps.map((step) => (
            <li
              key={step.id}
              id={step.id}
              className="flex items-start justify-between gap-2"
            >
              <div className="flex items-start gap-2.5">
                {step.status === "complete" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      step.status === "complete"
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.status === "incomplete" && (
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
              {step.action &&
                step.status === "incomplete" &&
                (step.action.href ? (
                  <a
                    href={step.action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {step.action.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 shrink-0 px-2 text-xs font-medium text-primary hover:bg-muted"
                    id="btn-add-linkedin-url"
                    onClick={
                      step.id === "step-linkedin"
                        ? openLinkedinDialog
                        : step.id === "step-preferences"
                          ? () => router.push("/onboarding/preferences")
                          : undefined
                    }
                    type="button"
                  >
                    {step.action.label}
                  </Button>
                ))}
            </li>
          ))}
        </ul>

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
                  className={
                    linkedinFormError ? "border-destructive" : undefined
                  }
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

        {/* Empty state: No LinkedIn */}
        {!profile?.linkedin_url && (
          <div className="mt-4 border border-dashed border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Add your LinkedIn URL above to unlock profile scoring
              </p>
            </div>
          </div>
        )}

        {/* LinkedIn PDF export upload — unlocks profile scoring */}
        {profile?.linkedin_url && user?.id && (
          <div className="mt-5 border-t border-border pt-4">
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
    </div>
  );
}
