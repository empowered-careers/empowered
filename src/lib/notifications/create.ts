// Privileged notification writer. NOT a "use server" module — these functions
// insert with the service-role client (bypassing RLS) to an arbitrary
// profile_id, so they must never be exposed as a callable server action.
// Called only from trusted server contexts: Inngest workers, the Stripe
// webhook, and server actions (admin/employer/assessment).

import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceClient } from "@/lib/supabase/service";
import type { Database, Json } from "@/types/database.types";
import type { ApplicationStatus, NotificationType } from "@/types/db";

type ServiceClient = SupabaseClient<Database>;

export interface CreateNotificationInput {
  profileId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Insert a notification row. RLS has no insert policy — only service_role
 * writes — so this always goes through the service-role client. Callers that
 * already hold one (Inngest workers, the Stripe webhook) pass it in to reuse
 * the connection; everyone else gets a fresh one.
 *
 * Fire-and-forget at each fan-out point: never throw into the source mutation's
 * happy path — log and move on so a notification failure can't roll back the
 * thing the user actually did.
 */
export async function createNotification(
  input: CreateNotificationInput,
  client?: ServiceClient
): Promise<void> {
  const supabase = client ?? createServiceClient();
  const { error } = await supabase.from("notifications").insert({
    profile_id: input.profileId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
    metadata: (input.metadata ?? {}) as Json,
  });
  if (error) {
    console.error("[createNotification]", input.type, error.message);
  }
}

// Only operator-driven advancement notifies the candidate. Candidate
// self-actions (interested, withdrawn) are excluded — mirrors the toast in
// use-application-notifications.ts.
const APPLICATION_STATUS_LABEL: Partial<Record<ApplicationStatus, string>> = {
  screening: "Screening",
  interviewing: "Interviewing",
  offer: "Offer",
  placed: "Placed",
};

/**
 * Fan-out helper for application status changes. No-op for statuses that
 * shouldn't notify the candidate. Inserts via the service-role client (fresh,
 * since admin/employer callers hold an RLS-scoped client that can't insert).
 */
export async function notifyApplicationStatus(
  profileId: string,
  status: ApplicationStatus
): Promise<void> {
  const label = APPLICATION_STATUS_LABEL[status];
  if (!label) return;
  await createNotification({
    profileId,
    type: "application_status",
    title: `Application moved to ${label}`,
    body: "Open your pipeline to see the update.",
    href: "/pipeline",
    metadata: { status },
  });
}
