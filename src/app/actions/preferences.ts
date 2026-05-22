"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type {
  CandidatePreferencesInsert,
  CandidatePreferencesUpdate,
  RemotePreference,
  SwitchUrgency,
  WorkAuth,
} from "@/types/db";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface OnboardingPreferencesInput {
  target_role: string;
  target_seniority: string | null;
  industries: string[];
  switch_urgency: SwitchUrgency;
  notice_period_days: number;
  work_authorization: WorkAuth;
}

/**
 * Validates and saves the Tier A subset, then stamps
 * `profiles.onboarding_completed_at` to release the soft gate. Idempotent —
 * calling again with a stamped profile just updates the prefs row.
 */
export async function completeOnboarding(
  input: OnboardingPreferencesInput
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  if (!input.target_role.trim())
    return { ok: false, error: "Target role is required." };
  if (input.industries.length === 0)
    return { ok: false, error: "Pick at least one industry." };
  if (input.notice_period_days < 0)
    return { ok: false, error: "Notice period must be zero or more." };

  const payload: CandidatePreferencesInsert = {
    profile_id: user.id,
    target_role: input.target_role.trim(),
    target_seniority: input.target_seniority,
    industries: input.industries,
    switch_urgency: input.switch_urgency,
    notice_period_days: input.notice_period_days,
    work_authorization: input.work_authorization,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from("candidate_preferences")
    .upsert(payload, { onConflict: "profile_id" });
  if (upsertError) return { ok: false, error: upsertError.message };

  const { error: stampError } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.id);
  if (stampError) return { ok: false, error: stampError.message };

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/job-board");
  return { ok: true };
}

export interface UpdatePreferencesInput {
  target_role?: string | null;
  target_seniority?: string | null;
  industries?: string[];
  switch_urgency?: SwitchUrgency | null;
  notice_period_days?: number | null;
  work_authorization?: WorkAuth | null;

  expected_salary_min_cents?: number | null;
  expected_salary_max_cents?: number | null;
  expected_salary_currency?: string | null;
  current_location?: string | null;
  remote_preference?: RemotePreference | null;

  current_salary_cents?: number | null;
  current_salary_currency?: string | null;
  willing_to_relocate?: boolean | null;
  target_companies?: string[];
  blocklist_companies?: string[];
  preferred_domains?: string[];
}

/**
 * Partial update of any preferences field from /profile. Onboarding stamp is
 * sticky — editing here never re-triggers the gate.
 */
export async function updatePreferences(
  input: UpdatePreferencesInput
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  if (
    input.expected_salary_min_cents != null &&
    input.expected_salary_max_cents != null &&
    input.expected_salary_min_cents > input.expected_salary_max_cents
  )
    return {
      ok: false,
      error: "Expected salary min cannot exceed the max.",
    };

  const update: CandidatePreferencesUpdate = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  // Upsert so the first /profile save works for candidates who haven't been
  // through onboarding yet (e.g. existing users at rollout time).
  const { error } = await supabase
    .from("candidate_preferences")
    .upsert({ profile_id: user.id, ...update }, { onConflict: "profile_id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}

export interface ExpressInterestPrefsInput {
  expected_salary_min_cents: number;
  expected_salary_max_cents: number;
  expected_salary_currency?: string;
  current_location: string;
  remote_preference: RemotePreference;
}

/**
 * Saves the Tier B fields collected in the express-interest consent modal
 * the first time a candidate applies. Called before `expressInterest` in the
 * job-board flow.
 */
export async function saveExpressInterestPrefs(
  input: ExpressInterestPrefsInput
): Promise<ActionResult> {
  if (input.expected_salary_min_cents > input.expected_salary_max_cents)
    return { ok: false, error: "Salary min cannot exceed the max." };
  if (!input.current_location.trim())
    return { ok: false, error: "Location is required." };

  return updatePreferences({
    expected_salary_min_cents: input.expected_salary_min_cents,
    expected_salary_max_cents: input.expected_salary_max_cents,
    expected_salary_currency: input.expected_salary_currency ?? "USD",
    current_location: input.current_location.trim(),
    remote_preference: input.remote_preference,
  });
}
