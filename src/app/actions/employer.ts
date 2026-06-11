"use server";

import { revalidatePath } from "next/cache";

import { requireEmployer } from "@/lib/auth/require-role";
import { notifyApplicationStatus } from "@/lib/notifications/create";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, JobStatus, RemotePolicy } from "@/types/db";

const EMPLOYER_ALLOWED_STATUSES = [
  "screening",
  "interviewing",
  "offer",
  "rejected",
] as const satisfies readonly ApplicationStatus[];

type EmployerAllowedStatus = (typeof EMPLOYER_ALLOWED_STATUSES)[number];

interface StatusLogEntry {
  status: ApplicationStatus;
  at: string;
  by: string;
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface EmployerJobInput {
  title: string;
  company_name: string;
  location?: string | null;
  remote_policy: RemotePolicy;
  salary_min?: number | null;
  salary_max?: number | null;
  description?: string | null;
  /** Agency partners only — end-client this role is posted for. */
  client_company_id?: string | null;
}

/**
 * Employer-side job CRUD. Tier is force-set to `tier_2` (agency/employer-
 * submitted, non-priority per ec-candidate-journey.md). Only Lauren can
 * promote a role to `tier_3` from /admin/jobs/[id]/edit; tier 1 stays
 * curated.
 */
export async function createJob(
  input: EmployerJobInput
): Promise<ActionResult<{ id: string }>> {
  const { employerId, relationshipType } = await requireEmployer();
  if (!employerId) {
    return {
      ok: false,
      error: "Admin impersonation can't post jobs — use /admin/jobs.",
    };
  }

  const clientCompanyId =
    relationshipType === "agency_partner"
      ? (input.client_company_id ?? null)
      : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      title: input.title,
      company_name: input.company_name,
      location: input.location ?? null,
      remote_policy: input.remote_policy,
      salary_min: input.salary_min ?? null,
      salary_max: input.salary_max ?? null,
      description: input.description ?? null,
      job_tier: "tier_2",
      submitted_by: employerId,
      client_company_id: clientCompanyId,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data)
    return { ok: false, error: error?.message ?? "Insert failed." };

  revalidatePath("/employer/jobs");
  revalidatePath("/employer");
  revalidatePath("/job-board");
  return { ok: true, data: { id: data.id } };
}

export async function updateJob(
  id: string,
  input: Partial<EmployerJobInput> & { status?: JobStatus }
): Promise<ActionResult> {
  const { employerId, relationshipType } = await requireEmployer();
  if (!employerId) {
    return { ok: false, error: "Admin impersonation can't edit jobs." };
  }

  // Strip client_company_id for direct-client employers — never write it.
  const patch: Record<string, unknown> = { ...input };
  if (relationshipType !== "agency_partner") {
    delete patch.client_company_id;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .update(patch)
    .eq("id", id)
    .eq("submitted_by", employerId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/employer/jobs");
  revalidatePath(`/employer/jobs/${id}/edit`);
  revalidatePath("/job-board");
  revalidatePath(`/job-board/${id}`);
  return { ok: true };
}

export async function archiveJob(id: string): Promise<ActionResult> {
  return updateJob(id, { status: "expired" });
}

/**
 * Move an application through the employer-allowed pipeline. `placed` is
 * deliberately excluded — that status drives commissions + placement fees
 * and stays admin-only via the `applications_update_employer` RLS check.
 * Appends to the jsonb `status_log` so audit history is preserved.
 */
export async function advanceApplicationStatus(
  applicationId: string,
  status: EmployerAllowedStatus
): Promise<ActionResult> {
  const { userId, employerId } = await requireEmployer();
  if (!employerId) {
    return { ok: false, error: "Admin impersonation can't move applications." };
  }
  if (!EMPLOYER_ALLOWED_STATUSES.includes(status)) {
    return { ok: false, error: "Status not allowed from the employer portal." };
  }

  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("applications")
    .select("status, status_log, profile_id")
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

  await notifyApplicationStatus(current.profile_id, status);

  revalidatePath("/employer/applications");
  revalidatePath(`/employer/applications/${applicationId}`);
  return { ok: true };
}

export interface ClientCompanyInput {
  name: string;
  contact_name?: string | null;
  contact_email?: string | null;
}

async function requireAgency(): Promise<
  { ok: true; employerId: string } | { ok: false; error: string }
> {
  const { employerId, relationshipType } = await requireEmployer();
  if (!employerId) {
    return { ok: false, error: "Admin impersonation can't manage clients." };
  }
  if (relationshipType !== "agency_partner") {
    return {
      ok: false,
      error: "Only agency partners can manage client companies.",
    };
  }
  return { ok: true, employerId };
}

export async function createClientCompany(
  input: ClientCompanyInput
): Promise<ActionResult<{ id: string }>> {
  const guard = await requireAgency();
  if (!guard.ok) return guard;

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_companies")
    .insert({
      agency_employer_id: guard.employerId,
      name,
      contact_name: input.contact_name?.trim() || null,
      contact_email: input.contact_email?.trim() || null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data)
    return { ok: false, error: error?.message ?? "Insert failed." };

  revalidatePath("/employer/clients");
  return { ok: true, data: { id: data.id } };
}

export async function updateClientCompany(
  id: string,
  input: Partial<ClientCompanyInput>
): Promise<ActionResult> {
  const guard = await requireAgency();
  if (!guard.ok) return guard;

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) return { ok: false, error: "Name is required." };
    patch.name = trimmed;
  }
  if (input.contact_name !== undefined)
    patch.contact_name = input.contact_name?.trim() || null;
  if (input.contact_email !== undefined)
    patch.contact_email = input.contact_email?.trim() || null;
  patch.updated_at = new Date().toISOString();

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_companies")
    .update(patch)
    .eq("id", id)
    .eq("agency_employer_id", guard.employerId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/employer/clients");
  revalidatePath(`/employer/clients/${id}`);
  return { ok: true };
}

export async function deleteClientCompany(id: string): Promise<ActionResult> {
  const guard = await requireAgency();
  if (!guard.ok) return guard;

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_companies")
    .delete()
    .eq("id", id)
    .eq("agency_employer_id", guard.employerId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/employer/clients");
  return { ok: true };
}
