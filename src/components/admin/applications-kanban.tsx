"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { updateApplicationStatus } from "@/app/actions/admin";
import { cn } from "@/lib/utils";
import type { ApplicationStatus, JobTier } from "@/types/db";

interface CandidateLite {
  id: string;
  full_name: string | null;
  email: string;
}

interface JobLite {
  id: string;
  title: string;
  company_name: string;
  job_tier: JobTier;
}

interface ApplicationRow {
  id: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  candidate: CandidateLite | CandidateLite[] | null;
  job: JobLite | JobLite[] | null;
}

interface Props {
  applications: ApplicationRow[];
}

const ACTIVE_COLUMNS: { status: ApplicationStatus; label: string }[] = [
  { status: "interested", label: "Interested" },
  { status: "submitted", label: "Submitted" },
  { status: "screening", label: "Screening" },
  { status: "interviewing", label: "Interviewing" },
  { status: "offer", label: "Offer" },
  { status: "placed", label: "Placed" },
];

const TERMINAL: ApplicationStatus[] = ["rejected", "withdrawn"];

const ALL_STATUSES: ApplicationStatus[] = [
  "interested",
  "submitted",
  "screening",
  "interviewing",
  "offer",
  "placed",
  "rejected",
  "withdrawn",
];

function daysAgo(iso: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
  );
}

function pickOne<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function ApplicationsKanban({ applications }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const byStatus = new Map<ApplicationStatus, ApplicationRow[]>();
  for (const s of ALL_STATUSES) byStatus.set(s, []);
  for (const app of applications) byStatus.get(app.status)?.push(app);

  const move = (id: string, status: ApplicationStatus) => {
    startTransition(async () => {
      const result = await updateApplicationStatus(id, status);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Status updated.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 [grid-template-columns:repeat(6,minmax(220px,1fr))] overflow-x-auto">
        {ACTIVE_COLUMNS.map((col) => {
          const items = byStatus.get(col.status) ?? [];
          return (
            <div
              className="flex min-w-[220px] flex-col rounded-md border border-border bg-muted/30"
              key={col.status}
            >
              <div className="flex items-center justify-between border-border border-b px-3 py-2 text-[12px] uppercase tracking-wide text-muted-foreground">
                <span>{col.label}</span>
                <span>{items.length}</span>
              </div>
              <div className="flex flex-col gap-2 p-2">
                {items.map((app) => {
                  const candidate = pickOne(app.candidate);
                  const job = pickOne(app.job);
                  return (
                    <div
                      className="rounded-md border border-border bg-card p-3 text-sm"
                      key={app.id}
                    >
                      <Link
                        className="block font-medium hover:text-accent"
                        href={`/admin/applications/${app.id}`}
                      >
                        {candidate?.full_name ?? candidate?.email ?? "—"}
                      </Link>
                      <div className="mt-1 text-muted-foreground text-xs">
                        {job?.title ?? "—"}
                        {job?.company_name ? ` · ${job.company_name}` : ""}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-[11px]">
                          {daysAgo(app.updated_at)}d in stage
                        </span>
                        <select
                          aria-label="Application status"
                          className={cn(
                            "h-7 border border-border bg-background px-1.5 text-[11px]",
                            pending && "opacity-50"
                          )}
                          disabled={pending}
                          onChange={(e) =>
                            move(app.id, e.target.value as ApplicationStatus)
                          }
                          value={app.status}
                        >
                          {ALL_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <p className="px-1 py-3 text-center text-muted-foreground text-xs">
                    Empty
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <details className="rounded-md border border-border bg-card p-3">
        <summary className="cursor-pointer text-sm">
          Closed (rejected + withdrawn ·{" "}
          {TERMINAL.reduce((sum, s) => sum + (byStatus.get(s)?.length ?? 0), 0)}
          )
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {TERMINAL.flatMap((s) => byStatus.get(s) ?? []).map((app) => {
            const candidate = pickOne(app.candidate);
            const job = pickOne(app.job);
            return (
              <Link
                className="rounded-md border border-border bg-muted/30 p-2 text-sm hover:border-accent/60"
                href={`/admin/applications/${app.id}`}
                key={app.id}
              >
                <div className="font-medium">
                  {candidate?.full_name ?? candidate?.email ?? "—"}
                </div>
                <div className="text-muted-foreground text-xs">
                  {job?.title ?? "—"} · {app.status}
                </div>
              </Link>
            );
          })}
        </div>
      </details>
    </div>
  );
}
