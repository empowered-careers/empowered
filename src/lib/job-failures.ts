/**
 * Pure helpers for the daily background-job failure sweep
 * (`src/inngest/functions/sweep-job-failures.ts`).
 *
 * Kept out of the Inngest function so the alert decision is testable without a
 * database or a validated env — importing the function itself pulls in env.ts,
 * which parses process.env at module load.
 */

export const LOOKBACK_HOURS = 24;

/** Well past the worst real parse (~250s for a failing run with retries). */
export const STUCK_AFTER_MINUTES = 30;

export interface FailureReport {
  resumeFailed: number;
  resumeStuck: number;
  linkedinFailed: number;
  linkedinStuck: number;
}

/** Total across every counter, plus the one-line summary a human reads. */
export function summariseFailures(r: FailureReport): {
  total: number;
  summary: string;
} {
  return {
    total: r.resumeFailed + r.resumeStuck + r.linkedinFailed + r.linkedinStuck,
    summary:
      `${r.resumeFailed} resume failed, ${r.resumeStuck} resume stuck, ` +
      `${r.linkedinFailed} LinkedIn failed, ${r.linkedinStuck} LinkedIn stuck ` +
      `in the last ${LOOKBACK_HOURS}h`,
  };
}
