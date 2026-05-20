"use client";

import { useAdminApplicationNotifications } from "@/hooks/use-admin-application-notifications";

/**
 * Mount point for admin-only realtime subscriptions. Lives inside
 * /admin/layout.tsx so it survives navigation within the admin shell and
 * never fires for non-admin users (layout guard runs first).
 */
export function AdminRealtime() {
  useAdminApplicationNotifications();
  return null;
}
