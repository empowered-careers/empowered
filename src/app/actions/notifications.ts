"use server";

import { createClient } from "@/lib/supabase/server";

// NOTE: the privileged writer (createNotification / notifyApplicationStatus)
// lives in @/lib/notifications/create — it inserts with the service-role
// client and must NOT be exposed as a callable server action. Only the
// user-scoped, RLS-checked mutations below belong here (the bell hook calls
// them from the client).

/**
 * Mark a single notification read. Uses the RLS server client — the candidate
 * owns the row, so the self-update policy applies.
 */
export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) {
    console.error("[markNotificationRead]", error.message);
  }
}

/**
 * Mark every unread notification for the current user read.
 */
export async function markAllRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .is("read_at", null);
  if (error) {
    console.error("[markAllRead]", error.message);
  }
}
