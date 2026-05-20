// Centralized aliases derived from the generated database.types.ts.
//
// ALWAYS import enum + row types from this file instead of re-deriving
// `Database["public"]["Enums"]["..."]` or `Database["public"]["Tables"]["..."]["Row"]`
// at call sites. Add new aliases here when a new table or enum is referenced
// in app code.

import type { Database } from "@/types/database.types";

// --- Enums ---
export type Plan = Database["public"]["Enums"]["plan"];
export type JobTier = Database["public"]["Enums"]["job_tier"];
export type JobStatus = Database["public"]["Enums"]["job_status"];
export type RemotePolicy = Database["public"]["Enums"]["remote_policy"];
export type UserRole = Database["public"]["Enums"]["user_role"];
export type ApplicationStatus =
  Database["public"]["Enums"]["application_status"];
export type RelationshipType = Database["public"]["Enums"]["relationship_type"];
export type ResumeStatus = Database["public"]["Enums"]["resume_status"];
export type LinkedinSyncStatus =
  Database["public"]["Enums"]["linkedin_sync_status"];
export type BillingCadence = Database["public"]["Enums"]["billing_cadence"];

// --- Row aliases (full Row shape from the generated types) ---
export type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
export type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"];
export type JobUpdate = Database["public"]["Tables"]["jobs"]["Update"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ApplicationRow =
  Database["public"]["Tables"]["applications"]["Row"];
export type EmployerRow = Database["public"]["Tables"]["employers"]["Row"];
export type ResumeRow = Database["public"]["Tables"]["resumes"]["Row"];
export type LinkedinProfileRow =
  Database["public"]["Tables"]["linkedin_profiles"]["Row"];

// --- Narrow column-subset types for list views ---
// Keep the SELECT column string in JOB_CARD_COLUMNS and this Pick in sync.
export const JOB_CARD_COLUMNS =
  "id, title, company_name, location, job_tier, remote_policy, salary_min, salary_max, posted_at" as const;
export type JobCardFields = Pick<
  JobRow,
  | "id"
  | "title"
  | "company_name"
  | "location"
  | "job_tier"
  | "remote_policy"
  | "salary_min"
  | "salary_max"
  | "posted_at"
>;

export const JOB_LIST_COLUMNS =
  "id, title, company_name, job_tier, status, posted_at" as const;
export type JobListFields = Pick<
  JobRow,
  "id" | "title" | "company_name" | "job_tier" | "status" | "posted_at"
>;

// Pipeline view: candidate's applications joined to the minimum job fields
// needed to render the kanban cards.
export const APPLICATION_PIPELINE_COLUMNS =
  "id, job_id, status, created_at, updated_at" as const;
export type ApplicationPipelineFields = Pick<
  ApplicationRow,
  "id" | "job_id" | "status" | "created_at" | "updated_at"
>;

export const PIPELINE_JOB_COLUMNS =
  "id, title, company_name, location, job_tier, posted_at" as const;
export type PipelineJobFields = Pick<
  JobRow,
  "id" | "title" | "company_name" | "location" | "job_tier" | "posted_at"
>;

// Admin candidate pool: minimum fields rendered in the /admin/candidates table.
export const ADMIN_CANDIDATE_LIST_COLUMNS =
  "id, full_name, email, plan, subscription_status, created_at, linkedin_url" as const;
export type AdminCandidateListFields = Pick<
  ProfileRow,
  | "id"
  | "full_name"
  | "email"
  | "plan"
  | "subscription_status"
  | "created_at"
  | "linkedin_url"
>;
