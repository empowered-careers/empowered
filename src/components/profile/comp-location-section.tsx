"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updatePreferences } from "@/app/actions/preferences";
import { SectionShell } from "@/components/profile/section-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CandidatePreferencesRow, RemotePreference } from "@/types/db";

const REMOTE_LABEL: Record<RemotePreference, string> = {
  remote: "Remote only",
  hybrid: "Hybrid",
  onsite: "Onsite",
  flexible: "Flexible",
};

function centsToDollars(cents: number | null): string {
  if (cents == null) return "";
  return Math.round(cents / 100).toString();
}

function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function CompLocationSection({
  preferences,
}: {
  preferences: CandidatePreferencesRow | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [expectedMin, setExpectedMin] = useState(
    centsToDollars(preferences?.expected_salary_min_cents ?? null)
  );
  const [expectedMax, setExpectedMax] = useState(
    centsToDollars(preferences?.expected_salary_max_cents ?? null)
  );
  const [currentSalary, setCurrentSalary] = useState(
    centsToDollars(preferences?.current_salary_cents ?? null)
  );
  const [location, setLocation] = useState(preferences?.current_location ?? "");
  const [remotePref, setRemotePref] = useState<RemotePreference | "">(
    preferences?.remote_preference ?? ""
  );
  const [relocate, setRelocate] = useState<boolean | null>(
    preferences?.willing_to_relocate ?? null
  );

  const save = () => {
    const expectedMinCents = dollarsToCents(expectedMin);
    const expectedMaxCents = dollarsToCents(expectedMax);
    const currentSalaryCents = dollarsToCents(currentSalary);

    startTransition(async () => {
      const result = await updatePreferences({
        expected_salary_min_cents: expectedMinCents,
        expected_salary_max_cents: expectedMaxCents,
        current_salary_cents: currentSalaryCents,
        current_location: location.trim() || null,
        remote_preference: (remotePref || null) as RemotePreference | null,
        willing_to_relocate: relocate,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Comp & location saved.");
      router.refresh();
    });
  };

  return (
    <SectionShell
      title="Comp & location"
      description="Shared with hiring teams when you express interest."
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Current salary ($/yr)" htmlFor="cur_salary">
            <Input
              id="cur_salary"
              type="number"
              min={0}
              value={currentSalary}
              onChange={(e) => setCurrentSalary(e.target.value)}
              placeholder="180000"
            />
          </Field>
          <Field label="Expected min ($/yr)" htmlFor="exp_min">
            <Input
              id="exp_min"
              type="number"
              min={0}
              value={expectedMin}
              onChange={(e) => setExpectedMin(e.target.value)}
              placeholder="200000"
            />
          </Field>
          <Field label="Expected max ($/yr)" htmlFor="exp_max">
            <Input
              id="exp_max"
              type="number"
              min={0}
              value={expectedMax}
              onChange={(e) => setExpectedMax(e.target.value)}
              placeholder="250000"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Current location" htmlFor="cur_location">
            <Input
              id="cur_location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="San Francisco, CA"
            />
          </Field>
          <Field label="Remote preference" htmlFor="remote_pref">
            <select
              id="remote_pref"
              className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={remotePref}
              onChange={(e) =>
                setRemotePref(e.target.value as RemotePreference)
              }
            >
              <option value="">—</option>
              {(Object.keys(REMOTE_LABEL) as RemotePreference[]).map((k) => (
                <option key={k} value={k}>
                  {REMOTE_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Willing to relocate?" htmlFor="relocate">
            <select
              id="relocate"
              className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={relocate === null ? "" : relocate ? "yes" : "no"}
              onChange={(e) =>
                setRelocate(
                  e.target.value === "" ? null : e.target.value === "yes"
                )
              }
            >
              <option value="">—</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
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
  children,
}: {
  label: string;
  htmlFor: string;
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
    </div>
  );
}
