"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useState, useTransition } from "react";
import { toast } from "sonner";

import { updatePreferences } from "@/app/actions/preferences";
import { SectionShell } from "@/components/profile/section-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CandidatePreferencesRow } from "@/types/db";

export function TargetCompaniesSection({
  preferences,
}: {
  preferences: CandidatePreferencesRow | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [targets, setTargets] = useState<string[]>(
    preferences?.target_companies ?? []
  );
  const [blocklist, setBlocklist] = useState<string[]>(
    preferences?.blocklist_companies ?? []
  );

  const persist = (next: {
    target_companies?: string[];
    blocklist_companies?: string[];
  }) => {
    startTransition(async () => {
      const result = await updatePreferences(next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <SectionShell
      title="Companies"
      description="Free-text for now. We'll switch to a keyed company index later."
    >
      <div className="space-y-5">
        <ChipList
          label="Target companies"
          items={targets}
          onAdd={(name) => {
            const next = Array.from(new Set([...targets, name]));
            setTargets(next);
            persist({ target_companies: next });
          }}
          onRemove={(name) => {
            const next = targets.filter((c) => c !== name);
            setTargets(next);
            persist({ target_companies: next });
          }}
          pending={pending}
        />
        <ChipList
          label="Blocklist"
          hint="Never shown to employers."
          items={blocklist}
          onAdd={(name) => {
            const next = Array.from(new Set([...blocklist, name]));
            setBlocklist(next);
            persist({ blocklist_companies: next });
          }}
          onRemove={(name) => {
            const next = blocklist.filter((c) => c !== name);
            setBlocklist(next);
            persist({ blocklist_companies: next });
          }}
          pending={pending}
        />
      </div>
    </SectionShell>
  );
}

function ChipList({
  label,
  hint,
  items,
  onAdd,
  onRemove,
  pending,
}: {
  label: string;
  hint?: string;
  items: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  pending: boolean;
}) {
  const [input, setInput] = useState("");

  const submit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInput("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Add a company and press Enter"
          disabled={pending}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={submit}
          disabled={pending || !input.trim()}
        >
          Add
        </Button>
      </div>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2 pt-1">
          {items.map((name) => (
            <li
              key={name}
              className="flex items-center gap-1.5 border border-border bg-muted px-2 py-1 text-xs text-foreground"
            >
              {name}
              <button
                type="button"
                onClick={() => onRemove(name)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
