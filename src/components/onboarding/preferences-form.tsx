"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { completeOnboarding } from "@/app/actions/preferences";
import { RoleTagInput } from "@/components/onboarding/role-tag-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { RemotePreference, SwitchUrgency, WorkAuth } from "@/types/db";

// --- Step config ---

type TextStep = {
  type: "text";
  field: string;
  tag: string;
  question: string;
  placeholder: string;
};

type RolesStep = Omit<TextStep, "type"> & { type: "roles" };

type RadioStep = {
  type: "radio";
  field: string;
  tag: string;
  question: string;
  options: { value: string; label: string }[];
};

const STEPS: (TextStep | RolesStep | RadioStep)[] = [
  {
    type: "roles",
    field: "target_role",
    tag: "Your search",
    question: "What roles are you targeting?",
    placeholder: "Start typing a role…",
  },
  {
    type: "radio",
    field: "switch_urgency",
    tag: "Your search",
    question: "Which best describes your current situation?",
    options: [
      { value: "Immediate need", label: "I need a job immediately" },
      { value: "Actively searching", label: "Actively searching" },
      {
        value: "Passively exploring",
        label: "Passively exploring opportunities",
      },
      { value: "Career growth", label: "I want career growth" },
      {
        value: "Leadership prep",
        label: "Preparing for leadership opportunities",
      },
    ],
  },
  {
    type: "radio",
    field: "target_seniority",
    tag: "Your search",
    question: "What level best describes your current role?",
    options: [
      { value: "Senior IC", label: "Senior individual contributor" },
      { value: "Lead / Principal", label: "Lead / principal" },
      { value: "Manager", label: "Manager" },
      { value: "Director", label: "Director" },
      { value: "VP / Executive", label: "Vice president / executive" },
    ],
  },
  {
    type: "radio",
    field: "expertise_area",
    tag: "Your search",
    question: "Which area best describes your expertise?",
    options: [
      { value: "Software Engineering", label: "Software engineering" },
      { value: "Cybersecurity", label: "Cybersecurity" },
      { value: "Data / AI", label: "Data / AI" },
      { value: "Cloud / Infrastructure", label: "Cloud / infrastructure" },
      {
        value: "Product / Program / IT Leadership",
        label: "Product / program / IT leadership",
      },
      { value: "Other", label: "Other" },
    ],
  },
  {
    type: "radio",
    field: "biggest_challenge",
    tag: "Your search",
    question: "What is your biggest challenge right now?",
    options: [
      { value: "Career clarity", label: "Career clarity" },
      { value: "Personal branding", label: "Personal branding" },
      { value: "Getting interviews", label: "Getting interviews" },
      { value: "Interview performance", label: "Interview performance" },
      { value: "Confidence and mindset", label: "Confidence and mindset" },
    ],
  },
  {
    type: "radio",
    field: "primary_goal_6mo",
    tag: "Your goals",
    question: "What is your primary goal for the next 6 months?",
    options: [
      { value: "Land a new role", label: "Land a new role" },
      { value: "Increase compensation", label: "Increase compensation" },
      { value: "Earn a promotion", label: "Earn a promotion" },
      { value: "Move into leadership", label: "Move into leadership" },
      { value: "Find meaningful work", label: "Find more meaningful work" },
    ],
  },
  {
    type: "radio",
    field: "confidence_level",
    tag: "Mindset",
    question:
      "How confident are you in your ability to achieve your career goals?",
    options: [
      { value: "Very Low", label: "Very low" },
      { value: "Low", label: "Low" },
      { value: "Moderate", label: "Moderate" },
      { value: "High", label: "High" },
      { value: "Very High", label: "Very high" },
    ],
  },
  {
    type: "radio",
    field: "role_clarity",
    tag: "Your goals",
    question: "How clear are you about your ideal next role?",
    options: [
      { value: "Not Clear", label: "Not clear" },
      { value: "Slightly Clear", label: "Slightly clear" },
      { value: "Somewhat Clear", label: "Somewhat clear" },
      { value: "Mostly Clear", label: "Mostly clear" },
      { value: "Crystal Clear", label: "Crystal clear" },
    ],
  },
  {
    type: "radio",
    field: "career_readiness",
    tag: "Your readiness",
    question: "Which best describes your current career readiness?",
    options: [
      { value: "Start from scratch", label: "I need to start from scratch" },
      { value: "Resume needs work", label: "My resume needs work" },
      { value: "LinkedIn needs work", label: "My LinkedIn needs work" },
      { value: "Needs stronger strategy", label: "I need a stronger strategy" },
      { value: "Ready to pursue", label: "I'm ready to pursue opportunities" },
    ],
  },
  {
    type: "radio",
    field: "most_valued_benefit",
    tag: "Your search",
    question: "Which benefit is most valuable to you?",
    options: [
      {
        value: "Exclusive job opportunities",
        label: "Exclusive job opportunities",
      },
      { value: "Career coaching", label: "Career coaching" },
      { value: "AI-powered guidance", label: "AI-powered guidance" },
      { value: "Professional networking", label: "Professional networking" },
      { value: "Interview preparation", label: "Interview preparation" },
    ],
  },
  {
    type: "radio",
    field: "support_preference",
    tag: "Support",
    question: "How much support would you like throughout your career journey?",
    options: [
      { value: "Self-Guided", label: "Self-guided" },
      { value: "AI-Guided", label: "AI-guided" },
      { value: "Group Coaching", label: "Group coaching" },
      { value: "1:1 Coaching", label: "1:1 coaching" },
      { value: "Not Sure Yet", label: "Not sure yet" },
    ],
  },
  {
    type: "radio",
    field: "work_authorization",
    tag: "Your search",
    question: "What is your current work authorization status?",
    options: [
      { value: "U.S. Citizen", label: "U.S. Citizen" },
      { value: "Green Card (GC)", label: "Green Card holder" },
      { value: "EAD", label: "EAD (Employment Authorization Document)" },
      { value: "TN", label: "TN visa" },
      { value: "H-1B", label: "H-1B visa" },
      { value: "Other Visa", label: "Other US visa" },
      { value: "EU Citizen", label: "EU Citizen" },
      { value: "Other", label: "Other" },
    ],
  },
  {
    type: "radio",
    field: "comp_target",
    tag: "Your search",
    question: "What is your compensation target?",
    options: [
      { value: "Under $150k", label: "Under $150k" },
      { value: "$150k – $175k", label: "$150k – $175k" },
      { value: "$175k – $200k", label: "$175k – $200k" },
      { value: "$200k – $250k", label: "$200k – $250k" },
      { value: "$250k+", label: "$250k+" },
    ],
  },
  {
    type: "radio",
    field: "remote_preference",
    tag: "Your search",
    question: "What is your work location preference?",
    options: [
      { value: "Remote", label: "Remote" },
      { value: "Hybrid", label: "Hybrid" },
      { value: "Onsite", label: "Onsite" },
      { value: "No Preference", label: "No preference / flexible" },
    ],
  },
  {
    type: "radio",
    field: "notice_period",
    tag: "Your search",
    question: "What is your notice period?",
    options: [
      { value: "Immediately", label: "Available immediately" },
      { value: "2 weeks", label: "2 weeks" },
      { value: "30 days", label: "30 days" },
      { value: "60 days", label: "60 days" },
      { value: "90 days", label: "90 days" },
    ],
  },
];

const TOTAL = STEPS.length;

const SUMMARY_LABELS: Record<string, string> = {
  target_role: "Target roles",
  switch_urgency: "Current situation",
  target_seniority: "Role level",
  expertise_area: "Expertise area",
  biggest_challenge: "Biggest challenge",
  primary_goal_6mo: "Primary goal",
  confidence_level: "Confidence",
  role_clarity: "Role clarity",
  career_readiness: "Career readiness",
  most_valued_benefit: "Most valued benefit",
  support_preference: "Support preference",
  work_authorization: "Work authorization",
  comp_target: "Comp target",
  remote_preference: "Location preference",
  notice_period: "Notice period",
};

// Maps display values → DB enum/column values

const SWITCH_URGENCY_MAP: Record<string, SwitchUrgency> = {
  "Immediate need": "actively_looking",
  "Actively searching": "actively_looking",
  "Passively exploring": "open",
  "Career growth": "passive",
  "Leadership prep": "passive",
};

const SENIORITY_MAP: Record<string, string> = {
  "Senior IC": "ic",
  "Lead / Principal": "lead",
  Manager: "manager",
  Director: "director",
  "VP / Executive": "vp",
};

const WORK_AUTH_MAP: Record<string, WorkAuth> = {
  "U.S. Citizen": "us_citizen",
  "Green Card (GC)": "us_permanent_resident",
  EAD: "us_visa_needed",
  TN: "us_visa_needed",
  "H-1B": "us_visa_needed",
  "Other Visa": "us_visa_needed",
  "EU Citizen": "eu_citizen",
  Other: "other",
};

const REMOTE_MAP: Record<string, RemotePreference> = {
  Remote: "remote",
  Hybrid: "hybrid",
  Onsite: "onsite",
  "No Preference": "flexible",
};

const NOTICE_MAP: Record<string, number> = {
  Immediately: 0,
  "2 weeks": 14,
  "30 days": 30,
  "60 days": 60,
  "90 days": 90,
};

const COMP_MAP: Record<string, number> = {
  "Under $150k": 0,
  "$150k – $175k": 15000000,
  "$175k – $200k": 17500000,
  "$200k – $250k": 20000000,
  "$250k+": 25000000,
};

export function PreferencesForm({ initialRole }: { initialRole: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({
    target_role: initialRole,
  });
  const [done, setDone] = useState(false);

  const current = STEPS[step];
  const answer = answers[current.field] ?? "";
  const canAdvance =
    current.type === "radio" ? answer.length > 0 : answer.trim().length > 0;

  const select = (value: string) =>
    setAnswers((prev) => ({ ...prev, [current.field]: value }));

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const goNext = () => {
    if (!canAdvance) return;
    if (step < TOTAL - 1) {
      setStep((s) => s + 1);
    } else {
      submit();
    }
  };

  const submit = () => {
    startTransition(async () => {
      const result = await completeOnboarding({
        target_role: answers.target_role ?? "",
        target_seniority: SENIORITY_MAP[answers.target_seniority] ?? null,
        switch_urgency: SWITCH_URGENCY_MAP[answers.switch_urgency] ?? "open",
        work_authorization:
          WORK_AUTH_MAP[answers.work_authorization] ?? "other",
        notice_period_days: NOTICE_MAP[answers.notice_period] ?? 0,
        remote_preference: REMOTE_MAP[answers.remote_preference] ?? null,
        comp_target_min_cents: COMP_MAP[answers.comp_target] ?? null,
        expertise_area: answers.expertise_area ?? null,
        biggest_challenge: answers.biggest_challenge ?? null,
        primary_goal_6mo: answers.primary_goal_6mo ?? null,
        confidence_level: answers.confidence_level ?? null,
        role_clarity: answers.role_clarity ?? null,
        career_readiness: answers.career_readiness ?? null,
        most_valued_benefit: answers.most_valued_benefit ?? null,
        support_preference: answers.support_preference ?? null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDone(true);
    });
  };

  const pct = Math.round(((step + 1) / TOTAL) * 100);

  if (done) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent/15">
          <svg
            className="h-6 w-6 text-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h2 className="text-xl font-medium text-foreground mb-2">
          Assessment complete
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your Empowered Careers journey is tailored to your goals.
        </p>
        <div className="grid grid-cols-2 gap-2.5 mb-7 text-left">
          {STEPS.map((s) => {
            const val = answers[s.field];
            if (!val) return null;
            return (
              <div
                key={s.field}
                className="rounded-md bg-muted/50 px-3.5 py-2.5"
              >
                <p className="text-[11px] text-muted-foreground mb-0.5">
                  {SUMMARY_LABELS[s.field]}
                </p>
                <p className="text-[13px] font-medium text-foreground">{val}</p>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => {
            toast.success("Profile complete — job board unlocked.");
            router.push("/dashboard");
            router.refresh();
          }}
          className="bg-primary px-7 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          View my dashboard ↗
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      {/* Progress bar */}
      <div className="h-1 w-full bg-muted mb-8">
        <div
          className="h-1 bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Tag */}
      <span className="inline-block bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
        {current.tag}
      </span>

      {/* Question */}
      <p className="text-[17px] font-medium text-foreground leading-snug mb-6">
        {current.question}
      </p>

      {/* Step content */}
      {current.type === "roles" ? (
        <RoleTagInput
          value={answer}
          onChange={select}
          placeholder={current.placeholder}
        />
      ) : current.type === "text" ? (
        <input
          autoFocus
          type="text"
          className="w-full border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
          placeholder={current.placeholder}
          value={answer}
          onChange={(e) => select(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && goNext()}
        />
      ) : (
        <RadioGroup
          value={answer}
          onValueChange={select}
          className="gap-2.5"
          aria-label={current.question}
        >
          {current.options.map((opt) => {
            const selected = answer === opt.value;
            const id = `${current.field}-${opt.value}`;
            return (
              <label
                key={opt.value}
                htmlFor={id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 border px-4 py-3 text-left text-sm transition-colors",
                  selected
                    ? "border-foreground bg-accent/10"
                    : "border-border/60 bg-background hover:border-border hover:bg-muted/40"
                )}
              >
                <RadioGroupItem
                  id={id}
                  value={opt.value}
                  className="shadow-none data-[state=checked]:border-foreground data-[state=checked]:bg-foreground [&_svg]:fill-background"
                />
                <span className="font-[450] text-foreground">{opt.label}</span>
              </label>
            );
          })}
        </RadioGroup>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={goBack}
          className={cn(
            "border border-border px-5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40",
            step === 0 && "invisible"
          )}
        >
          ← Back
        </button>

        <span className="text-[13px] text-muted-foreground">
          {step + 1} of {TOTAL}
        </span>

        <button
          type="button"
          onClick={goNext}
          disabled={!canAdvance || pending}
          className="bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-default"
        >
          {pending ? "Saving…" : step === TOTAL - 1 ? "Submit ✓" : "Next →"}
        </button>
      </div>
    </div>
  );
}
