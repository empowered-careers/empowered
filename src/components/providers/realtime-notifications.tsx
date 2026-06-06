"use client";

import { useApplicationNotifications } from "@/hooks/use-application-notifications";
import { useLinkedinNotifications } from "@/hooks/use-linkedin-notifications";
import { useNotificationFeed } from "@/hooks/use-notification-feed";
import { usePaymentNotifications } from "@/hooks/use-payment-notifications";
import { useResumeNotifications } from "@/hooks/use-resume-notifications";

/**
 * Single mount point for every per-domain Supabase Realtime notification hook.
 * Survives navigation because it lives inside the root layout's AuthProvider.
 * Add new hooks here as async features ship (assessments, matches, payments…).
 */
export function RealtimeNotifications() {
  useResumeNotifications();
  useLinkedinNotifications();
  useApplicationNotifications();
  usePaymentNotifications();
  // Keeps the persistent bell feed warm + subscribed across navigation.
  useNotificationFeed();
  return null;
}
