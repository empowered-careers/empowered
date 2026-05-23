"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
 * Employer-side counterpart to useAdminApplicationNotifications. Subscribes
 * to all `applications` rows (RLS already filters to this employer's jobs)
 * and toasts on inserts + status transitions. Pre-loads the set of this
 * employer's job ids so we can skip work if a row's job_id isn't ours —
 * RLS guarantees correctness; this just avoids spurious invalidations.
 */
export function useEmployerApplicationNotifications() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [jobIds, setJobIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { data } = await supabase.from("jobs").select("id");
      if (!cancelled) {
        setJobIds(new Set((data ?? []).map((j) => j.id)));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (jobIds === null) return;

    const supabase = createClient();
    const channel = supabase
      .channel("employer-applications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications" },
        (payload) => {
          const row = (payload.new ?? payload.old) as ApplicationRowPartial;
          if (!jobIds.has(row.job_id)) return;

          if (payload.eventType === "INSERT") {
            toast.info("New candidate interested", {
              description: `${STATUS_LABEL[row.status]} · ${row.id.slice(0, 8)}`,
              action: {
                label: "Open",
                onClick: () => router.push(`/employer/applications/${row.id}`),
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
                      router.push(`/employer/applications/${next.id}`),
                  },
                }
              );
            }
          }

          queryClient.invalidateQueries({
            queryKey: queryKeys.employer.applications.all,
          });
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [jobIds, queryClient, router]);
}
