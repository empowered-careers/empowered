"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updatePreferences } from "@/app/actions/preferences";
import { SectionShell } from "@/components/profile/section-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  CandidatePreferencesRow,
  SwitchUrgency,
  WorkAuth,
} from "@/types/db";

const URGENCY_LABEL: Record<SwitchUrgency, string> = {
  actively_looking: "Actively looking",
  open: "Open to roles",
  passive: "Passive",
  not_looking: "Not looking",
};

const WORK_AUTH_LABEL: Record<WorkAuth, string> = {
  us_citizen: "US citizen",
  us_permanent_resident: "US permanent resident",
  us_visa_needed: "Need US visa sponsorship",
  eu_citizen: "EU citizen",
  other: "Other",
};

const NOTICE_OPTIONS = [0, 14, 30, 60, 90];

const SENIORITY_OPTIONS = [
  { value: "", label: "No preference" },
  { value: "ic", label: "Individual contributor" },
  { value: "lead", label: "Lead / staff" },
  { value: "manager", label: "Manager" },
  { value: "director", label: "Director" },
  { value: "vp", label: "VP" },
  { value: "c_level", label: "C-level" },
];

export function PreferencesSection({
  preferences,
}: {
  preferences: CandidatePreferencesRow | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [targetRole, setTargetRole] = useState(preferences?.target_role ?? "");
  const [seniority, setSeniority] = useState(
    preferences?.target_seniority ?? ""
  );
  const [industriesInput, setIndustriesInput] = useState(
    (preferences?.industries ?? []).join(", ")
  );
  const [urgency, setUrgency] = useState<SwitchUrgency | "">(
    preferences?.switch_urgency ?? ""
  );
  const [notice, setNotice] = useState<number | "">(
    preferences?.notice_period_days ?? ""
  );
  const [workAuth, setWorkAuth] = useState<WorkAuth | "">(
    preferences?.work_authorization ?? ""
  );

  const save = () => {
    const industries = industriesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    startTransition(async () => {
      const result = await updatePreferences({
        target_role: targetRole.trim() || null,
        target_seniority: seniority || null,
        industries,
        switch_urgency: (urgency || null) as SwitchUrgency | null,
        notice_period_days: notice === "" ? null : notice,
        work_authorization: (workAuth || null) as WorkAuth | null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Preferences updated.");
      router.refresh();
    });
  };

  return (
    <SectionShell
      title="Job preferences"
      description="Drives matching and Lauren's outreach. Edits never trigger the onboarding gate again."
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Target role" htmlFor="pref_target_role">
            <Input
              id="pref_target_role"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="Senior Product Manager"
            />
          </Field>
          <Field label="Target seniority" htmlFor="pref_seniority">
            <select
              id="pref_seniority"
              className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={seniority}
              onChange={(e) => setSeniority(e.target.value)}
            >
              {SENIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          label="Industries"
          htmlFor="pref_industries"
          hint="Comma-separated."
        >
          <Input
            id="pref_industries"
            value={industriesInput}
            onChange={(e) => setIndustriesInput(e.target.value)}
            placeholder="fintech, healthtech"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Search status" htmlFor="pref_urgency">
            <select
              id="pref_urgency"
              className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as SwitchUrgency)}
            >
              <option value="">—</option>
              {(Object.keys(URGENCY_LABEL) as SwitchUrgency[]).map((k) => (
                <option key={k} value={k}>
                  {URGENCY_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notice period" htmlFor="pref_notice">
            <select
              id="pref_notice"
              className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={notice}
              onChange={(e) =>
                setNotice(e.target.value === "" ? "" : Number(e.target.value))
              }
            >
              <option value="">—</option>
              {NOTICE_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d === 0 ? "Immediately" : `${d} days`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Work authorization" htmlFor="pref_work_auth">
            <select
              id="pref_work_auth"
              className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={workAuth}
              onChange={(e) => setWorkAuth(e.target.value as WorkAuth)}
            >
              <option value="">—</option>
              {(Object.keys(WORK_AUTH_LABEL) as WorkAuth[]).map((k) => (
                <option key={k} value={k}>
                  {WORK_AUTH_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={pending} size="sm">
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </SectionShell>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
