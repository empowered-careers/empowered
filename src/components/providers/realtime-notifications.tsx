"use client";

import { useLinkedinNotifications } from "@/hooks/use-linkedin-notifications";
import { useResumeNotifications } from "@/hooks/use-resume-notifications";

/**
 * Single mount point for every per-domain Supabase Realtime notification hook.
 * Survives navigation because it lives inside the root layout's AuthProvider.
 * Add new hooks here as async features ship (assessments, matches, payments…).
 */
export function RealtimeNotifications() {
  useResumeNotifications();
  useLinkedinNotifications();
  return null;
}
