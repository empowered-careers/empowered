"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateIdentity } from "@/app/actions/profile";
import type { ProfileIdentity } from "@/components/profile/profile-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { SectionShell } from "./section-shell";

export function IdentitySection({ profile }: { profile: ProfileIdentity }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const result = await updateIdentity({ fullName, phone });
      if (result.success) {
        toast.success("Details updated");
        setEditing(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const cancel = () => {
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setEditing(false);
  };

  return (
    <SectionShell
      title="Identity"
      description="Email comes from your sign-in and can't be changed here."
    >
      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Full name"
              id="identity-full-name"
              value={fullName}
              onChange={setFullName}
              disabled={isPending}
            />
            <Field
              label="Phone"
              id="identity-phone"
              type="tel"
              value={phone}
              onChange={setPhone}
              disabled={isPending}
              placeholder="Optional"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={cancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
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
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit details
          </Button>
        </div>
      )}
    </SectionShell>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        htmlFor={id}
      >
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(ev) => onChange(ev.target.value)}
      />
    </div>
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
