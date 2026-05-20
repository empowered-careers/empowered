"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { queryKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";
import type { ApplicationStatus } from "@/types/db";

type ApplicationRowPartial = {
  id: string;
  profile_id: string;
  job_id: string;
  status: ApplicationStatus;
};

const STATUS_LABEL: Partial<Record<ApplicationStatus, string>> = {
  screening: "Screening",
  interviewing: "Interviewing",
  offer: "Offer",
  placed: "Placed",
};

export function useApplicationNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`applications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "applications",
          filter: `profile_id=eq.${user.id}`,
        },
        (payload) => {
          const next = payload.new as ApplicationRowPartial;
          const prev = payload.old as Partial<ApplicationRowPartial>;

          if (prev.status !== next.status) {
            const label = STATUS_LABEL[next.status];
            if (label) {
              toast.success(`Moved to ${label}`, {
                description: "Open your pipeline to see the update.",
                action: {
                  label: "View",
                  onClick: () => router.push("/pipeline"),
                },
              });
            }
            queryClient.invalidateQueries({
              queryKey: queryKeys.applications.forUser(user.id),
            });
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, queryClient, router]);
}
