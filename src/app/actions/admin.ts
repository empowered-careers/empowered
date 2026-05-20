"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { ApplicationStatus } from "@/types/db";

type CoachingProductInsert =
  Database["public"]["Tables"]["coaching_products"]["Insert"];
type CoachingProductUpdate =
  Database["public"]["Tables"]["coaching_products"]["Update"];
type EmployerInsert = Database["public"]["Tables"]["employers"]["Insert"];
type EmployerUpdate = Database["public"]["Tables"]["employers"]["Update"];
type CommissionStatus = Database["public"]["Enums"]["commission_status"];

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Update the admin-only `internal_notes` free-text field on a candidate profile.
 * RLS (`profiles_admin_update`) backs this up so a non-admin caller would fail
 * at the database even if `requireAdmin()` were bypassed.
 */
export async function updateInternalNotes(
  profileId: string,
  notes: string
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ internal_notes: notes })
    .eq("id", profileId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/candidates/${profileId}`);
  return { ok: true };
}

/**
 * Manual Plan-3 grant — used for comp accounts, free placements, etc. Bypasses
 * Stripe; just flips `plan` + `subscription_status` on the profile so Tier 3
 * jobs become visible to them via the `can_see_job_tier()` RLS function.
 */
export async function grantPlan3(profileId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ plan: "plan_3", subscription_status: "active" })
    .eq("id", profileId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/candidates/${profileId}`);
  revalidatePath("/admin/candidates");
  return { ok: true };
}

interface StatusLogEntry {
  status: ApplicationStatus;
  at: string;
  by: string;
}

/**
 * Move an application to a new status. Appends to the jsonb `status_log` so
 * Lauren can see every transition with timestamp + who moved it.
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
): Promise<ActionResult> {
  const { userId } = await requireAdmin();
  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("applications")
    .select("status, status_log")
    .eq("id", applicationId)
    .single();

  if (readError || !current)
    return { ok: false, error: readError?.message ?? "Application not found." };

  if (current.status === status) return { ok: true };

  const existingLog = Array.isArray(current.status_log)
    ? (current.status_log as unknown as StatusLogEntry[])
    : [];
  const entry: StatusLogEntry = {
    status,
    at: new Date().toISOString(),
    by: userId,
  };

  const { error } = await supabase
    .from("applications")
    .update({ status, status_log: [...existingLog, entry] })
    .eq("id", applicationId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);
  return { ok: true };
}

export interface MarkAsPlacedInput {
  applicationId: string;
  feeAmountCents: number | null;
  salaryCents: number | null;
  startDate: string | null;
  notes: string | null;
}

/**
 * Convert an application into a placement. Inserts placements row, flips the
 * application to `placed`, and — when the employer is `agency_partner` —
 * inserts a commissions row at the employer's `commission_rate`. Best-effort
 * sequencing (no transactional wrapper available client-side); errors bubble
 * back to the caller for retry.
 */
export async function markAsPlaced(
  input: MarkAsPlacedInput
): Promise<ActionResult<{ placementId: string; commissionId: string | null }>> {
  const { userId } = await requireAdmin();
  const supabase = await createClient();

  const { data: app, error: appError } = await supabase
    .from("applications")
    .select(
      "id, profile_id, job_id, status, status_log, job:jobs(submitted_by)"
    )
    .eq("id", input.applicationId)
    .single();

  if (appError || !app)
    return { ok: false, error: appError?.message ?? "Application not found." };

  const job = Array.isArray(app.job) ? app.job[0] : app.job;
  if (!job?.submitted_by)
    return { ok: false, error: "Job has no employer on file." };

  const { data: employer, error: empError } = await supabase
    .from("employers")
    .select("id, relationship_type, commission_rate")
    .eq("id", job.submitted_by)
    .single();

  if (empError || !employer)
    return { ok: false, error: empError?.message ?? "Employer not found." };

  const { data: placement, error: placementError } = await supabase
    .from("placements")
    .insert({
      application_id: app.id,
      profile_id: app.profile_id,
      job_id: app.job_id,
      employer_id: employer.id,
      fee_amount: input.feeAmountCents,
      salary: input.salaryCents,
      start_date: input.startDate,
      notes: input.notes,
    })
    .select("id")
    .single<{ id: string }>();

  if (placementError || !placement)
    return {
      ok: false,
      error: placementError?.message ?? "Could not create placement.",
    };

  const existingLog = Array.isArray(app.status_log)
    ? (app.status_log as unknown as StatusLogEntry[])
    : [];
  const entry: StatusLogEntry = {
    status: "placed",
    at: new Date().toISOString(),
    by: userId,
  };

  const { error: statusError } = await supabase
    .from("applications")
    .update({ status: "placed", status_log: [...existingLog, entry] })
    .eq("id", app.id);

  if (statusError) return { ok: false, error: statusError.message };

  let commissionId: string | null = null;
  if (
    employer.relationship_type === "agency_partner" &&
    employer.commission_rate &&
    input.feeAmountCents
  ) {
    const amountCents = Math.round(
      input.feeAmountCents * employer.commission_rate
    );
    const { data: commission, error: commissionError } = await supabase
      .from("commissions")
      .insert({
        placement_id: placement.id,
        employer_id: employer.id,
        amount_cents: amountCents,
        rate: employer.commission_rate,
      })
      .select("id")
      .single<{ id: string }>();

    if (commissionError) return { ok: false, error: commissionError.message };
    commissionId = commission?.id ?? null;
  }

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${app.id}`);
  revalidatePath("/admin/placements");
  revalidatePath("/admin/commissions");
  revalidatePath("/admin");
  return { ok: true, data: { placementId: placement.id, commissionId } };
}

/**
 * Move a commission through the lifecycle. Stamps invoiced_at / paid_at when
 * the matching status fires so the ledger renders dates without a join.
 */
export async function updateCommissionStatus(
  commissionId: string,
  status: CommissionStatus
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const patch: Database["public"]["Tables"]["commissions"]["Update"] = {
    status,
  };
  if (status === "invoiced") patch.invoiced_at = new Date().toISOString();
  if (status === "paid") patch.paid_at = new Date().toISOString();

  const { error } = await supabase
    .from("commissions")
    .update(patch)
    .eq("id", commissionId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/commissions");
  revalidatePath("/admin");
  return { ok: true };
}

export interface EmployerInput {
  company_name: string;
  contact_name: string;
  contact_email: string;
  relationship_type: "direct_client" | "agency_partner";
  commission_rate: number | null;
  notes: string | null;
}

export async function createEmployer(
  input: EmployerInput
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const supabase = await createClient();

  const payload: EmployerInsert = input;
  const { data, error } = await supabase
    .from("employers")
    .insert(payload)
    .select("id")
    .single<{ id: string }>();

  if (error || !data)
    return { ok: false, error: error?.message ?? "Insert failed." };

  revalidatePath("/admin/employers");
  return { ok: true, data: { id: data.id } };
}

export async function updateEmployer(
  id: string,
  input: Partial<EmployerInput>
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const payload: EmployerUpdate = input;
  const { error } = await supabase
    .from("employers")
    .update(payload)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/employers");
  revalidatePath(`/admin/employers/${id}`);
  return { ok: true };
}

/**
 * Magic-link invite for an employer contact. Wired once the agency portal
 * ships in docs/ec-admin-agency-plan.md — until /employer routes exist there
 * is nowhere for the invitee to land, so this returns an explanatory error.
 */
export async function inviteEmployerContact(
  employerId: string
): Promise<ActionResult> {
  await requireAdmin();
  void employerId;
  return {
    ok: false,
    error:
      "Employer invites unlock when the agency portal ships (see docs/ec-admin-agency-plan.md).",
  };
}

export interface CoachingProductInput {
  name: string;
  type: Database["public"]["Enums"]["coaching_product_type"];
  description: string | null;
  price_cents: number | null;
  external_url: string | null;
  is_active: boolean;
}

export async function createCoachingProduct(
  input: CoachingProductInput
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const supabase = await createClient();

  const payload: CoachingProductInsert = input;
  const { data, error } = await supabase
    .from("coaching_products")
    .insert(payload)
    .select("id")
    .single<{ id: string }>();

  if (error || !data)
    return { ok: false, error: error?.message ?? "Insert failed." };

  revalidatePath("/admin/coaching");
  return { ok: true, data: { id: data.id } };
}

export async function updateCoachingProduct(
  id: string,
  input: Partial<CoachingProductInput>
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const payload: CoachingProductUpdate = input;
  const { error } = await supabase
    .from("coaching_products")
    .update(payload)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/coaching");
  return { ok: true };
}
