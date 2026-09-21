import { NonRetriableError } from "inngest";

import {
  LOOKBACK_HOURS,
  STUCK_AFTER_MINUTES,
  summariseFailures,
} from "@/lib/job-failures";
import { sendLoopsEvent } from "@/lib/loops/client";
import { createServiceClient } from "@/lib/supabase/service";

import { env } from "../../../env";
import { inngest } from "../client";

/**
 * Daily check for background jobs that failed or got stuck.
 *
 * Exists because of the September beta: 7 resume parses failed silently between
 * the 8th and the 15th and nobody knew until testers emailed to ask why nothing
 * was happening. The parser bug was an afternoon's work; not noticing it for two
 * weeks is what cost us the goodwill. The point of this function is that the
 * next one surfaces in a day.
 *
 * Two signals, deliberately:
 *  - A Loops event to OPS_ALERT_EMAIL, which is the channel a human actually
 *    reads. Needs `pipeline.failures` wiring up in Loops once (see
 *    docs/ec-admin-operations.md) or it sends into the void.
 *  - A thrown error, so the run goes red in the Inngest dashboard with the
 *    counts in the message. Zero configuration, and it still works if the Loops
 *    side was never wired. Deliberately the last thing we do.
 *
 * ponytail: no alert-state table and no deduplication — this re-reports the same
 * failed row every day until someone clears it. That is the intended nagging.
 * Add a `notified_at` column if the noise ever becomes the reason people stop
 * reading it.
 */
export const sweepJobFailuresFn = inngest.createFunction(
  {
    id: "sweep-job-failures",
    // Re-running re-reads current state, so a retry is harmless — but the throw
    // at the end is the alert, and retrying it would just send the same mail
    // twice. One attempt; tomorrow's run covers a hard failure.
    retries: 0,
    // 06:30 UTC, half an hour before sweep-inactive so the two don't interleave.
    triggers: [{ cron: "30 6 * * *" }],
  },
  async ({ step }) => {
    const supabase = createServiceClient();
    const since = new Date(
      Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000
    ).toISOString();
    const stuckBefore = new Date(
      Date.now() - STUCK_AFTER_MINUTES * 60 * 1000
    ).toISOString();

    const report = await step.run("collect-failures", async () => {
      const [resumeFailed, resumeStuck, linkedinFailed, linkedinStuck] =
        await Promise.all([
          supabase
            .from("resumes")
            .select("id, file_name, parse_error", { count: "exact" })
            .eq("status", "failed")
            .gte("uploaded_at", since),
          supabase
            .from("resumes")
            .select("id", { count: "exact", head: true })
            .eq("status", "processing")
            .lt("uploaded_at", stuckBefore),
          supabase
            .from("linkedin_profiles")
            .select("id, sync_error", { count: "exact" })
            .eq("status", "failed")
            .gte("sync_started_at", since),
          supabase
            .from("linkedin_profiles")
            .select("id", { count: "exact", head: true })
            .eq("status", "processing")
            .lt("sync_started_at", stuckBefore),
        ]);

      // Distinct error strings are what tells you "one bad PDF" from "the
      // parser is down" at a glance, so carry a sample rather than just counts.
      const errors = [
        ...(resumeFailed.data ?? []).map((r) => r.parse_error),
        ...(linkedinFailed.data ?? []).map((r) => r.sync_error),
      ].filter((e): e is string => !!e);

      return {
        resumeFailed: resumeFailed.count ?? 0,
        resumeStuck: resumeStuck.count ?? 0,
        linkedinFailed: linkedinFailed.count ?? 0,
        linkedinStuck: linkedinStuck.count ?? 0,
        sampleErrors: [...new Set(errors)].slice(0, 5),
      };
    });

    const { total, summary } = summariseFailures(report);

    if (total === 0) {
      console.log("[sweep-job-failures] clean");
      return { ok: true, ...report };
    }

    console.error("[sweep-job-failures]", summary, report.sampleErrors);

    await step.run("notify-ops", async () => {
      const to = env.OPS_ALERT_EMAIL;
      if (!to) return { sent: false };
      await sendLoopsEvent({
        email: to,
        eventName: "pipeline.failures",
        eventProperties: {
          summary,
          resumeFailed: report.resumeFailed,
          resumeStuck: report.resumeStuck,
          linkedinFailed: report.linkedinFailed,
          linkedinStuck: report.linkedinStuck,
          sampleErrors: report.sampleErrors.join(" | "),
        },
      });
      return { sent: true };
    });

    // Last: turns the run red in Inngest so this is visible even if the Loops
    // template was never wired. NonRetriable because retrying re-sends.
    throw new NonRetriableError(`Background job failures — ${summary}`);
  }
);
