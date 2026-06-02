import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: ReactNode;
  delta?: string;
  sub?: string;
}

export function StatCard({ title, value, delta, sub }: StatCardProps) {
  return (
    <div className="flex flex-col gap-2 border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <p className="font-display text-4xl font-medium leading-none text-foreground">
        {value}
      </p>
      {delta && (
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
          {delta}
        </p>
      )}
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
