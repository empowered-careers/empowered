"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { grantPlan3 } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Candidate {
  id: string;
  full_name: string | null;
  email: string;
  plan: string;
}

interface Props {
  candidates: Candidate[];
}

export function GrantPlan3Form({ candidates }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return candidates
      .filter((c) => {
        if (c.plan === "plan_3") return false;
        const name = c.full_name?.toLowerCase() ?? "";
        return name.includes(q) || c.email.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [candidates, query]);

  const selected = selectedId
    ? (candidates.find((c) => c.id === selectedId) ?? null)
    : null;

  const handleGrant = () => {
    if (!selected) return;
    startTransition(async () => {
      const result = await grantPlan3(selected.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Granted Plan 3 to ${selected.full_name ?? selected.email}.`
      );
      setQuery("");
      setSelectedId(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {selected ? (
        <div className="flex items-center justify-between gap-3 border border-border bg-card p-3 text-sm">
          <div>
            <div className="font-medium">
              {selected.full_name ?? selected.email}
            </div>
            <div className="text-muted-foreground text-xs">
              {selected.email} · currently {selected.plan}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button disabled={pending} onClick={handleGrant} type="button">
              {pending ? "Granting…" : "Grant Plan 3"}
            </Button>
            <Button
              disabled={pending}
              onClick={() => setSelectedId(null)}
              type="button"
              variant="ghost"
            >
              Clear
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Input
            className="max-w-md"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            value={query}
          />
          {matches.length > 0 && (
            <ul className="max-w-md divide-y divide-border border border-border bg-card">
              {matches.map((c) => (
                <li key={c.id}>
                  <button
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent/40"
                    onClick={() => setSelectedId(c.id)}
                    type="button"
                  >
                    <span>
                      <span className="block font-medium">
                        {c.full_name ?? c.email}
                      </span>
                      <span className="block text-muted-foreground text-xs">
                        {c.email}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {c.plan}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim() && matches.length === 0 && (
            <p className="text-muted-foreground text-xs">
              No eligible candidates match (Plan 3 holders are hidden).
            </p>
          )}
        </>
      )}
    </div>
  );
}
