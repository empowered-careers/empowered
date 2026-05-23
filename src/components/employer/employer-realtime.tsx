"use client";

import { useEmployerApplicationNotifications } from "@/hooks/use-employer-application-notifications";

/**
 * Mount point for employer-only realtime subscriptions. Lives inside
 * /employer/layout.tsx so it survives navigation within the employer shell
 * and never fires for non-employer users (layout guard runs first).
 */
export function EmployerRealtime() {
  useEmployerApplicationNotifications();
  return null;
}
