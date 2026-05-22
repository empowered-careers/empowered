"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import type { RemotePreference } from "@/types/db";

const REMOTE_OPTIONS: { value: RemotePreference; label: string }[] = [
  { value: "remote", label: "Remote only" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
  { value: "flexible", label: "Flexible" },
];

export interface ExpressInterestPrefsValues {
  expected_salary_min_cents: number;
  expected_salary_max_cents: number;
  current_location: string;
  remote_preference: RemotePreference;
}

interface Props {
  onChange: (values: ExpressInterestPrefsValues | null) => void;
}

/**
 * One-screen prompt prepended to the Express Interest modal the first time
 * a candidate applies — captures comp + location + remote preference.
 * Reports a tuple of valid values up via `onChange`, or `null` while the
 * inputs are incomplete.
 */
export function ExpressInterestPrefsStep({ onChange }: Props) {
  const [minK, setMinK] = useState("");
  const [maxK, setMaxK] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState<RemotePreference | "">("");

  const recompute = (
    nextMin: string,
    nextMax: string,
    nextLocation: string,
    nextRemote: RemotePreference | ""
  ) => {
    const minN = Number(nextMin);
    const maxN = Number(nextMax);
    if (
      !nextLocation.trim() ||
      !nextRemote ||
      !Number.isFinite(minN) ||
      !Number.isFinite(maxN) ||
      minN <= 0 ||
      maxN <= 0 ||
      minN > maxN
    ) {
      onChange(null);
      return;
    }
    onChange({
      expected_salary_min_cents: Math.round(minN * 1000 * 100),
      expected_salary_max_cents: Math.round(maxN * 1000 * 100),
      current_location: nextLocation.trim(),
      remote_preference: nextRemote,
    });
  };

  return (
    <div className="space-y-3 border border-border bg-muted/30 p-4">
      <p className="text-xs text-muted-foreground">
        First time expressing interest — quick three fields the hiring team will
        see.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldLabel label="Expected min ($k/yr)">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={minK}
            onChange={(e) => {
              setMinK(e.target.value);
              recompute(e.target.value, maxK, location, remote);
            }}
            placeholder="200"
          />
        </FieldLabel>
        <FieldLabel label="Expected max ($k/yr)">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={maxK}
            onChange={(e) => {
              setMaxK(e.target.value);
              recompute(minK, e.target.value, location, remote);
            }}
            placeholder="250"
          />
        </FieldLabel>
      </div>
      <FieldLabel label="Current location">
        <Input
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            recompute(minK, maxK, e.target.value, remote);
          }}
          placeholder="San Francisco, CA"
        />
      </FieldLabel>
      <FieldLabel label="Remote preference">
        <select
          className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={remote}
          onChange={(e) => {
            const v = e.target.value as RemotePreference | "";
            setRemote(v);
            recompute(minK, maxK, location, v);
          }}
        >
          <option value="">Select…</option>
          {REMOTE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FieldLabel>
    </div>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
      <span className="uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
