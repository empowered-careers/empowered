/**
 * Free-tier quota for the JD → ATS checker: 5 per calendar month (resolved
 * decision, `ec-pivot-plan.md` §2). Pure so `jd-quota.check.ts` can pin the
 * month-boundary behaviour, which is the part that quietly gives away free
 * checks if it's wrong.
 */
export const FREE_JD_PER_MONTH = 5;

/**
 * Start of the current calendar month in UTC, as an ISO string for the
 * `created_at >=` filter.
 *
 * ponytail: UTC, not the candidate's timezone. A candidate near a month boundary
 * may see the reset a few hours early or late; that is cheaper than storing a
 * timezone per profile to police five free calls. Revisit only if quota disputes
 * actually show up.
 */
export function monthStartIso(now: Date): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  ).toISOString();
}

export interface QuotaState {
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
}

/**
 * `unlimited` is true for candidates who own something — any active enrollment.
 * Paid checks are recorded with `source = 'paid'` and never counted against the
 * free allowance.
 */
export function quotaState(
  usedThisMonth: number,
  unlimited: boolean
): QuotaState {
  if (unlimited) {
    return {
      used: usedThisMonth,
      limit: Number.POSITIVE_INFINITY,
      remaining: Number.POSITIVE_INFINITY,
      exhausted: false,
    };
  }
  const used = Math.max(0, usedThisMonth);
  const remaining = Math.max(0, FREE_JD_PER_MONTH - used);
  return {
    used,
    limit: FREE_JD_PER_MONTH,
    remaining,
    exhausted: remaining === 0,
  };
}
