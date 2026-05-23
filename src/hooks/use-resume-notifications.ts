"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { queryKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";

type ResumeRowPartial = {
  id: string;
  status: string | null;
  profile_id: string;
};

export function useResumeNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`resume-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "resumes",
          filter: `profile_id=eq.${user.id}`,
        },
        (payload) => {
          const next = payload.new as ResumeRowPartial;
          const prev = payload.old as Partial<ResumeRowPartial>;

          if (prev.status === "processing" && next.status === "complete") {
            toast.success("Resume parsed", {
              description: "Your Resume score is ready.",
              action: {
                label: "View",
                onClick: () => router.push("/dashboard#resume-hub"),
              },
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.dashboard.byUser(user.id),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.resumes.byUser(user.id),
            });
            router.refresh();
          } else if (next.status === "failed") {
            toast.error("Resume parsing failed", {
              description: "Try uploading again.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, queryClient, router]);
}
