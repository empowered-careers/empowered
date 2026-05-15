"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { queryKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";

type LinkedinRowPartial = {
  id: string;
  status: string | null;
  profile_id: string;
};

export function useLinkedinNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`linkedin-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "linkedin_profiles",
          filter: `profile_id=eq.${user.id}`,
        },
        (payload) => {
          const next = payload.new as LinkedinRowPartial;
          const prev = payload.old as Partial<LinkedinRowPartial>;

          if (prev.status === "processing" && next.status === "complete") {
            toast.success("LinkedIn sync complete", {
              description: "Your profile score is ready.",
              action: {
                label: "View",
                onClick: () => router.push("/dashboard"),
              },
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.dashboard.byUser(user.id),
            });
            router.refresh();
          } else if (next.status === "failed") {
            toast.error("LinkedIn sync failed", {
              description: "Try again from your dashboard.",
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
