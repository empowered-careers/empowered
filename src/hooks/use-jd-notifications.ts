"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";

/**
 * Toasts when a JD → ATS check finishes, so the candidate can navigate away
 * while Inngest works. Mounted once in `RealtimeNotifications`.
 *
 * ponytail: no stale watchdog like the resume/LinkedIn hooks have. `submitJd`
 * marks the row `failed` synchronously when `inngest.send` throws — the case
 * those watchdogs exist to catch — and the result page offers a free retry. Add
 * one if rows start hanging in `processing` for a different reason.
 */
type JdRowPartial = {
  id: string;
  status: string | null;
  ats_score: number | null;
};

export function useJdNotifications() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`jds-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jds",
          filter: `profile_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as JdRowPartial;

          if (row.status === "complete") {
            toast.success(
              row.ats_score !== null
                ? `JD match ready — ${row.ats_score}/100`
                : "JD match ready",
              {
                action: {
                  label: "View",
                  onClick: () => router.push(`/jd-match/${row.id}`),
                },
              }
            );
            router.refresh();
            return;
          }

          if (row.status === "failed") {
            toast.error("We couldn't score that JD.", {
              action: {
                label: "Retry",
                onClick: () => router.push(`/jd-match/${row.id}`),
              },
            });
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, router]);
}
