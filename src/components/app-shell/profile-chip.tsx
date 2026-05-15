"use client";

import Link from "next/link";

import { CompletenessRing } from "@/components/app-shell/completeness-ring";

export interface ProfileChipProps {
  name: string;
  /** 0–100 */
  completeness: number;
  /** e.g. "Plan 2 · Senior PM" */
  subline?: string;
  href?: string;
}

export function ProfileChip({
  name,
  completeness,
  subline,
  href = "/dashboard",
}: ProfileChipProps) {
  return (
    <Link
      className="mt-auto flex items-center gap-2.5 border border-transparent bg-card p-2.5 transition-colors hover:border-border"
      href={href}
    >
      <CompletenessRing value={completeness} />
      <div className="min-w-0">
        <div className="truncate font-medium text-[13px] text-foreground">
          {name}
        </div>
        {subline ? (
          <div className="truncate text-[11px] text-muted-foreground">
            {subline}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
