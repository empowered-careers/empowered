import type { JobTier, Plan } from "@/types/db";

export function canSeeJobTier(plan: Plan, tier: JobTier): boolean {
  switch (tier) {
    case "tier_1":
      return true;
    case "tier_2":
      return plan === "plan_1" || plan === "plan_2" || plan === "plan_3";
    case "tier_3":
      return plan === "plan_3";
  }
}

export const tierRequiredPlan: Record<JobTier, Plan> = {
  tier_1: "free",
  tier_2: "plan_1",
  tier_3: "plan_3",
};

export const tierLabel: Record<JobTier, string> = {
  tier_1: "Tier 1",
  tier_2: "Tier 2",
  tier_3: "Tier 3",
};

export const planLabel: Record<Plan, string> = {
  free: "Free",
  plan_1: "Plan 1",
  plan_2: "Plan 2",
  plan_3: "Plan 3",
};
