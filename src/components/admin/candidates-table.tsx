"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { planLabel } from "@/lib/plan";
import type { AdminCandidateListFields, Plan } from "@/types/db";

interface Props {
  candidates: AdminCandidateListFields[];
}

const PLAN_FILTERS: Array<{ value: "all" | Plan; label: string }> = [
  { value: "all", label: "All plans" },
  { value: "free", label: "Free" },
  { value: "plan_1", label: "À la carte" },
  { value: "plan_2", label: "Core" },
  { value: "plan_3", label: "Pro" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CandidatesTable({ candidates }: Props) {
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState<"all" | Plan>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((c) => {
      if (plan !== "all" && c.plan !== plan) return false;
      if (!q) return true;
      const name = c.full_name?.toLowerCase() ?? "";
      return name.includes(q) || c.email.toLowerCase().includes(q);
    });
  }, [candidates, query, plan]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email…"
          value={query}
        />
        <select
          aria-label="Filter by plan"
          className="h-9 border border-border bg-card px-2 text-sm"
          onChange={(e) => setPlan(e.target.value as "all" | Plan)}
          value={plan}
        >
          {PLAN_FILTERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <span className="ml-auto text-muted-foreground text-xs">
          {filtered.length} of {candidates.length}
        </span>
      </div>

      <div className="overflow-hidden border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Signed up</th>
              <th className="px-4 py-2 font-medium">LinkedIn</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2">{c.full_name ?? "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">{c.email}</td>
                <td className="px-4 py-2">
                  {planLabel[c.plan]}
                  {c.subscription_status !== "active" && c.plan !== "free" && (
                    <span className="ml-1 text-muted-foreground text-xs">
                      ({c.subscription_status})
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {formatDate(c.created_at)}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {c.linkedin_url ? "Linked" : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    className="text-accent hover:underline"
                    href={`/admin/candidates/${c.id}`}
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  className="px-4 py-6 text-center text-muted-foreground"
                  colSpan={6}
                >
                  No candidates match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
