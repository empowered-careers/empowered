import { fireCandidateInactive } from "@/lib/loops/client";
import { createServiceClient } from "@/lib/supabase/service";

import { inngest } from "../client";

/**
 * Daily inactivity sweep — the repo's first scheduled Inngest function.
 *
 * With no job-board digest to pull people back, re-engagement email is the only
 * thing that does it (brief §6).
 *
 * **Fires once per candidate per milestone, with no state column**, by matching
 * on a 24-hour window rather than a threshold: a candidate whose last sign-in
 * falls in `[now-8d, now-7d)` is exactly 7 days idle *today*, so a daily run sees
 * them once and never again. A `last_sign_in_at < now-7d` test would re-fire
 * every day until they returned.
 *
 * ponytail: reads `last_sign_in_at` from the auth admin API rather than adding a
 * `profiles.last_seen_at` column and writing to it on every page load. Costs a
 * paginated listUsers walk once a day; revisit if the user count makes that slow.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const PER_PAGE = 200;

function windowFor(days: number, now: number): { from: number; to: number } {
  return { from: now - (days + 1) * DAY_MS, to: now - days * DAY_MS };
}

export const sweepInactiveFn = inngest.createFunction(
  {
    id: "sweep-inactive",
    // Retries are safe: re-running the same day hits the same window and Loops
    // dedupes nothing, so a retry can double-send. Keep it at 1 attempt and let
    // tomorrow's run cover a hard failure.
    retries: 0,
    // 07:00 UTC — before the working day in EU, overnight in the US.
    triggers: [{ cron: "0 7 * * *" }],
  },
  async ({ step }) => {
    const supabase = createServiceClient();
    const now = Date.now();

    const candidates = await step.run("collect-idle-users", async () => {
      const idle: { email: string; days: 7 | 30 }[] = [];
      const seven = windowFor(7, now);
      const thirty = windowFor(30, now);

      for (let page = 1; ; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({
          page,
          perPage: PER_PAGE,
        });
        if (error) throw new Error(`collect-idle-users: ${error.message}`);
        const users = data?.users ?? [];
        if (users.length === 0) break;

        for (const user of users) {
          if (!user.email || !user.last_sign_in_at) continue;
          const last = new Date(user.last_sign_in_at).getTime();
          if (last >= seven.from && last < seven.to) {
            idle.push({ email: user.email, days: 7 });
          } else if (last >= thirty.from && last < thirty.to) {
            idle.push({ email: user.email, days: 30 });
          }
        }

        if (users.length < PER_PAGE) break;
      }
      return idle;
    });

    if (candidates.length === 0) return { fired: 0 };

    // Only candidates get re-engagement mail — admins and employers are staff.
    // Returns an array, not a Set: step results cross a serialization boundary.
    const candidateEmails = await step.run("filter-to-candidates", async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("email")
        .eq("role", "candidate")
        .in(
          "email",
          candidates.map((c) => c.email)
        );
      if (error) throw new Error(`filter-to-candidates: ${error.message}`);
      return (data ?? []).map((p) => p.email).filter(Boolean) as string[];
    });

    const allowed = new Set(candidateEmails);
    const toFire = candidates.filter((c) => allowed.has(c.email));

    await step.run("fire-loops", async () => {
      for (const c of toFire) {
        await fireCandidateInactive({ email: c.email, days: c.days });
      }
    });

    return { fired: toFire.length, considered: candidates.length };
  }
);
