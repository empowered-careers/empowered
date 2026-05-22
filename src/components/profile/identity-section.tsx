"use client";

import type { ProfileIdentity } from "@/components/profile/profile-client";

import { SectionShell } from "./section-shell";

export function IdentitySection({ profile }: { profile: ProfileIdentity }) {
  return (
    <SectionShell
      title="Identity"
      description="Synced from your OAuth provider. Email + name are read-only."
    >
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <Row label="Full name" value={profile.full_name ?? "—"} />
        <Row label="Email" value={profile.email} />
        <Row label="Phone" value={profile.phone ?? "—"} />
        <Row
          label="LinkedIn"
          value={profile.linkedin_url ?? "—"}
          mono={!!profile.linkedin_url}
        />
      </dl>
    </SectionShell>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "font-mono text-xs break-all text-foreground"
            : "text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
