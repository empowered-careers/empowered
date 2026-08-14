import { ArrowRight, GraduationCap } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { MyCoaching } from "@/lib/coaching";

/**
 * Dashboard summary of `enrollments` — the "My Coaching" card. Presentational
 * only; the data is fetched in `dashboard/page.tsx` and passed down.
 */
export function MyCoachingCard({ coaching }: { coaching: MyCoaching }) {
  const { items, upcoming } = coaching;
  const next = upcoming[0];
  const courses = items.filter((i) => i.product.kind === "course");
  const inProgress = courses.filter(
    (i) => i.enrollment.progress > 0 && i.enrollment.progress < 100
  ).length;

  return (
    <div className="border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <GraduationCap className="size-4 text-accent" />
        <h2 className="font-medium text-sm">My Coaching</h2>
      </div>

      {items.length === 0 ? (
        <>
          <p className="mt-3 text-muted-foreground text-sm">
            Coaching is à la carte — one session, or a full arc. Nothing
            recurring.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/pricing">
              Browse coaching
              <ArrowRight className="ml-1.5 size-3.5" />
            </Link>
          </Button>
        </>
      ) : (
        <>
          <p className="mt-3 font-display font-medium text-2xl">
            {items.length}
            <span className="ml-1.5 text-muted-foreground text-sm">
              {items.length === 1 ? "purchase" : "purchases"}
            </span>
          </p>
          <p className="mt-1 text-muted-foreground text-sm">
            {next
              ? `Next session ${new Date(next.scheduled_for).toLocaleDateString(
                  undefined,
                  { weekday: "long", month: "short", day: "numeric" }
                )}`
              : inProgress > 0
                ? `${inProgress} course${inProgress === 1 ? "" : "s"} in progress`
                : "Nothing booked yet"}
          </p>
          <Button asChild className="mt-4" size="sm" variant="outline">
            <Link href="/content">
              Open My Coaching
              <ArrowRight className="ml-1.5 size-3.5" />
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}
