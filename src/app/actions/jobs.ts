"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { JobStatus, JobTier, RemotePolicy, UserRole } from "@/types/db";

const SYSTEM_EMPLOYER_ID = "00000000-0000-0000-0000-000000000001";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface JobInput {
  title: string;
  company_name: string;
  location?: string | null;
  remote_policy: RemotePolicy;
  job_tier: JobTier;
  salary_min?: number | null;
  salary_max?: number | null;
  description?: string | null;
}

async function requireAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: UserRole }>();
  if (profile?.role !== "admin")
    return { ok: false as const, error: "Admin only." };
  return { ok: true as const, supabase, userId: user.id };
}

export async function createJob(
  input: JobInput
): Promise<ActionResult<{ id: string }>> {
  const guard = await requireAdminClient();
  if (!guard.ok) return { ok: false, error: guard.error };

  const { data, error } = await guard.supabase
    .from("jobs")
    .insert({
      ...input,
      submitted_by: SYSTEM_EMPLOYER_ID,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data)
    return { ok: false, error: error?.message ?? "Insert failed." };

  revalidatePath("/admin/jobs");
  revalidatePath("/job-board");
  return { ok: true, data: { id: data.id } };
}

export async function updateJob(
  id: string,
  input: Partial<JobInput> & { status?: JobStatus }
): Promise<ActionResult> {
  const guard = await requireAdminClient();
  if (!guard.ok) return { ok: false, error: guard.error };

  const { error } = await guard.supabase
    .from("jobs")
    .update(input)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/jobs/${id}/edit`);
  revalidatePath("/job-board");
  revalidatePath(`/job-board/${id}`);
  return { ok: true };
}

export async function archiveJob(id: string): Promise<ActionResult> {
  return updateJob(id, { status: "expired" });
}

export async function toggleSavedJob(
  jobId: string
): Promise<ActionResult<{ saved: boolean }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: existing } = await supabase
    .from("saved_jobs")
    .select("job_id")
    .eq("profile_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("saved_jobs")
      .delete()
      .eq("profile_id", user.id)
      .eq("job_id", jobId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/job-board");
    revalidatePath("/job-board/saved");
    return { ok: true, data: { saved: false } };
  }

  const { error } = await supabase
    .from("saved_jobs")
    .insert({ profile_id: user.id, job_id: jobId });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/job-board");
  revalidatePath("/job-board/saved");
  return { ok: true, data: { saved: true } };
}

/**
 * Idempotent: if the candidate already has an application for this job, the
 * existing row's id + status are returned and no new row is inserted. RLS
 * enforces profile_id=auth.uid() and status='interested' on insert.
 */
export async function expressInterest(
  jobId: string
): Promise<ActionResult<{ applicationId: string; alreadyApplied: boolean }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("profile_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existing) {
    return {
      ok: true,
      data: { applicationId: existing.id, alreadyApplied: true },
    };
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({ profile_id: user.id, job_id: jobId, status: "interested" })
    .select("id")
    .single<{ id: string }>();

  if (error || !data)
    return { ok: false, error: error?.message ?? "Could not save interest." };

  revalidatePath("/job-board");
  revalidatePath(`/job-board/${jobId}`);
  revalidatePath("/pipeline");
  return { ok: true, data: { applicationId: data.id, alreadyApplied: false } };
}

export async function withdrawApplication(
  applicationId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId)
    .eq("profile_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/job-board");
  revalidatePath("/pipeline");
  return { ok: true };
}
