"use client";

import { BlueprintSummarySection } from "@/components/profile/blueprint-summary-section";
import { CompLocationSection } from "@/components/profile/comp-location-section";
import { IdentitySection } from "@/components/profile/identity-section";
import { PreferencesSection } from "@/components/profile/preferences-section";
import { RoleClaritySummarySection } from "@/components/profile/role-clarity-summary-section";
import { TargetCompaniesSection } from "@/components/profile/target-companies-section";
import type { RoleClarityResult } from "@/lib/assessment/role-clarity";
import type { BlueprintResult } from "@/lib/assessment/types";
import type { CandidatePreferencesRow } from "@/types/db";

export interface ProfileIdentity {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
}

export function ProfileClient({
  profile,
  preferences,
  blueprint,
  roleClarity,
}: {
  profile: ProfileIdentity;
  preferences: CandidatePreferencesRow | null;
  blueprint: {
    archetype: string | null;
    completed_at: string | null;
    result: BlueprintResult | null;
  } | null;
  roleClarity: {
    completed_at: string | null;
    result: RoleClarityResult | null;
  } | null;
}) {
  return (
    <div className="space-y-6">
      <IdentitySection profile={profile} />
      <BlueprintSummarySection blueprint={blueprint} />
      <RoleClaritySummarySection roleClarity={roleClarity} />
      <PreferencesSection preferences={preferences} />
      <CompLocationSection preferences={preferences} />
      <TargetCompaniesSection preferences={preferences} />
    </div>
  );
}
