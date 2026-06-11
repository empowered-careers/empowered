import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { planLabel, tierLabel, tierRequiredPlan } from "@/lib/plan";
import type { JobTier } from "@/types/db";

export function TierLockedBanner({
  tier,
  count,
}: {
  tier: JobTier;
  count: number;
}) {
  const requiredPlan = tierRequiredPlan[tier];
  const noun = count === 1 ? "role" : "roles";
  const pricingAnchor = requiredPlan === "plan_3" ? "pro" : "core";

  return (
    <div className="flex flex-col items-start gap-3 border border-dashed border-border bg-card/50 p-6 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 size-5 text-accent" />
        <div>
          <div className="font-medium text-[14px]">
            {tierLabel[tier]} · {count} {noun} live this month
          </div>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            {planLabel[requiredPlan]} unlocks {tierLabel[tier]} roles.
          </p>
        </div>
      </div>
      <Button asChild size="sm">
        <a href={`/pricing#${pricingAnchor}`}>
          Upgrade to {planLabel[requiredPlan]}
        </a>
      </Button>
    </div>
  );
}
