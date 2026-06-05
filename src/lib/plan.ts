import type { JobTier, Plan } from "@/types/db";

export function canSeeJobTier(plan: Plan, tier: JobTier): boolean {
  switch (tier) {
    case "tier_1":
      return true;
    case "tier_2":
      // Jobs are subscription-only: Core (plan_2) and Pro (plan_3) unlock
      // Tier 2. plan_1 (à la carte) grants no job-board access.
      return plan === "plan_2" || plan === "plan_3";
    case "tier_3":
      return plan === "plan_3";
  }
}

export const tierRequiredPlan: Record<JobTier, Plan> = {
  tier_1: "free",
  tier_2: "plan_2",
  tier_3: "plan_3",
};

export const tierLabel: Record<JobTier, string> = {
  tier_1: "Tier 1",
  tier_2: "Tier 2",
  tier_3: "Tier 3",
};

// Display names. The DB enum keeps the stable plan_x values; "Core" / "Pro" are
// the marketed subscription tiers (plan_2 / plan_3). plan_1 is the legacy
// à-la-carte state — a one-time purchase that grants no job-board access.
export const planLabel: Record<Plan, string> = {
  free: "Free",
  plan_1: "À la carte",
  plan_2: "Core",
  plan_3: "Pro",
};

const planRank: Record<Plan, number> = {
  free: 0,
  plan_1: 1,
  plan_2: 2,
  plan_3: 3,
};

/**
 * Order plans for monotonic-upgrade enforcement (plan_3 > plan_2 > plan_1 > free).
 * Returns -1 if `a` is lower than `b`, 0 if equal, 1 if higher.
 *
 * The Stripe webhook uses this so a lower tier never downgrades a higher one
 * (e.g. an à-la-carte purchase must not knock a Pro subscriber down).
 */
export function comparePlans(a: Plan, b: Plan): -1 | 0 | 1 {
  const diff = planRank[a] - planRank[b];
  return diff < 0 ? -1 : diff > 0 ? 1 : 0;
}
