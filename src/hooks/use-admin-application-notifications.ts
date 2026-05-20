"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { queryKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";
import type { ApplicationStatus } from "@/types/db";

type ApplicationRowPartial = {
  id: string;
  profile_id: string;
  job_id: string;
  status: ApplicationStatus;
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  interested: "Interested",
  submitted: "Submitted",
  screening: "Screening",
  interviewing: "Interviewing",
  offer: "Offer",
  placed: "Placed",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/**
 * Admin-side counterpart to useApplicationNotifications. Subscribes to every
 * row in `applications` (no profile_id filter) so Lauren sees movement across
 * the whole pipeline in realtime. Mounted from /admin/layout.tsx via a tiny
 * client wrapper.
 */
export function useAdminApplicationNotifications() {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-applications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as ApplicationRowPartial;
            toast.info("New application", {
              description: `${STATUS_LABEL[row.status]} · ${row.id.slice(0, 8)}`,
              action: {
                label: "Open",
                onClick: () => router.push(`/admin/applications/${row.id}`),
              },
            });
          } else if (payload.eventType === "UPDATE") {
            const next = payload.new as ApplicationRowPartial;
            const prev = payload.old as Partial<ApplicationRowPartial>;
            if (prev.status && prev.status !== next.status) {
              toast.success(
                `${STATUS_LABEL[prev.status]} → ${STATUS_LABEL[next.status]}`,
                {
                  action: {
                    label: "Open",
                    onClick: () =>
                      router.push(`/admin/applications/${next.id}`),
                  },
                }
              );
            }
          }

          queryClient.invalidateQueries({
            queryKey: queryKeys.admin.applications.all,
          });
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, router]);
}
