"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";

import { completeOnboarding } from "@/app/actions/preferences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SwitchUrgency, WorkAuth } from "@/types/db";

const URGENCY_OPTIONS: { value: SwitchUrgency; label: string; hint: string }[] =
  [
    {
      value: "actively_looking",
      label: "Actively looking",
      hint: "Ready to interview now",
    },
    {
      value: "open",
      label: "Open to roles",
      hint: "Not actively searching but will consider strong matches",
    },
    {
      value: "passive",
      label: "Passive",
      hint: "Only the most exceptional opportunities",
    },
    {
      value: "not_looking",
      label: "Not looking",
      hint: "Pause matches for now",
    },
  ];

const WORK_AUTH_OPTIONS: { value: WorkAuth; label: string }[] = [
  { value: "us_citizen", label: "US citizen" },
  { value: "us_permanent_resident", label: "US permanent resident" },
  { value: "us_visa_needed", label: "Need US visa sponsorship" },
  { value: "eu_citizen", label: "EU citizen" },
  { value: "other", label: "Other" },
];

const NOTICE_OPTIONS = [0, 14, 30, 60, 90];

const SENIORITY_OPTIONS = [
  { value: "ic", label: "Individual contributor" },
  { value: "lead", label: "Lead / staff" },
  { value: "manager", label: "Manager" },
  { value: "director", label: "Director" },
  { value: "vp", label: "VP" },
  { value: "c_level", label: "C-level" },
];

interface InitialState {
  target_role: string;
  target_seniority: string;
  industries: string[];
  switch_urgency: SwitchUrgency | null;
  notice_period_days: number | null;
  work_authorization: WorkAuth | null;
}

export function PreferencesForm({ initial }: { initial: InitialState }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [targetRole, setTargetRole] = useState(initial.target_role);
  const [seniority, setSeniority] = useState(initial.target_seniority);
  const [industriesInput, setIndustriesInput] = useState(
    initial.industries.join(", ")
  );
  const [urgency, setUrgency] = useState<SwitchUrgency | "">(
    initial.switch_urgency ?? ""
  );
  const [notice, setNotice] = useState<number | "">(
    initial.notice_period_days ?? ""
  );
  const [workAuth, setWorkAuth] = useState<WorkAuth | "">(
    initial.work_authorization ?? ""
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const industries = industriesInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (!targetRole.trim())
      return setError("Tell us the role title you're targeting.");
    if (industries.length === 0)
      return setError("Add at least one industry (comma-separated).");
    if (!urgency) return setError("Pick a search status.");
    if (notice === "") return setError("Pick your notice period.");
    if (!workAuth) return setError("Tell us your work authorization.");

    startTransition(async () => {
      const result = await completeOnboarding({
        target_role: targetRole,
        target_seniority: seniority || null,
        industries,
        switch_urgency: urgency,
        notice_period_days: notice,
        work_authorization: workAuth,
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Profile complete — job board unlocked.");
      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Field label="Target role" htmlFor="target_role" required>
        <Input
          id="target_role"
          name="target_role"
          placeholder="e.g. Senior Product Manager"
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          autoComplete="organization-title"
        />
      </Field>

      <Field
        label="Target seniority"
        htmlFor="target_seniority"
        hint="Pre-filled from your resume when available."
      >
        <select
          id="target_seniority"
          name="target_seniority"
          className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={seniority}
          onChange={(e) => setSeniority(e.target.value)}
        >
          <option value="">No preference</option>
          {SENIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Industries"
        htmlFor="industries"
        hint="Comma-separated. e.g. fintech, healthtech, climate."
        required
      >
        <Input
          id="industries"
          name="industries"
          placeholder="fintech, healthtech"
          value={industriesInput}
          onChange={(e) => setIndustriesInput(e.target.value)}
        />
      </Field>

      <Field label="Search status" htmlFor="switch_urgency" required>
        <div className="grid gap-2" role="radiogroup">
          {URGENCY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 border px-3 py-2 text-sm ${
                urgency === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <input
                type="radio"
                name="switch_urgency"
                value={opt.value}
                checked={urgency === opt.value}
                onChange={() => setUrgency(opt.value)}
                className="mt-1"
              />
              <span>
                <span className="block font-medium text-foreground">
                  {opt.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {opt.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Notice period" htmlFor="notice_period_days" required>
        <select
          id="notice_period_days"
          name="notice_period_days"
          className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={notice}
          onChange={(e) =>
            setNotice(e.target.value === "" ? "" : Number(e.target.value))
          }
        >
          <option value="">Select…</option>
          {NOTICE_OPTIONS.map((days) => (
            <option key={days} value={days}>
              {days === 0
                ? "Immediately"
                : `${days} day${days === 1 ? "" : "s"}`}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Work authorization" htmlFor="work_authorization" required>
        <select
          id="work_authorization"
          name="work_authorization"
          className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={workAuth}
          onChange={(e) => setWorkAuth(e.target.value as WorkAuth)}
        >
          <option value="">Select…</option>
          {WORK_AUTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save & continue"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
