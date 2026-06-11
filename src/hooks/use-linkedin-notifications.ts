"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { queryKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";

type LinkedinRowPartial = {
  id: string;
  status: string | null;
  profile_id: string;
  sync_started_at?: string | null;
};

// A sync stuck in `processing` past this window is force-failed, covering a
// silent `inngest.send` failure or a worker that dies without firing
// `onFailure`. ('idle' is the resting state, not a running job.)
const STALE_TIMEOUT_MS = 60_000;

export function useLinkedinNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  // Per-row watchdog timers, keyed by linkedin_profiles id.
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const timers = timersRef.current;

    const clearTimer = (id: string) => {
      const t = timers.get(id);
      if (t) {
        clearTimeout(t);
        timers.delete(id);
      }
    };

    const armTimer = (id: string, syncStartedAt?: string | null) => {
      if (timers.has(id)) return;
      const startedMs = syncStartedAt
        ? new Date(syncStartedAt).getTime()
        : Date.now();
      const delay = Math.max(0, STALE_TIMEOUT_MS - (Date.now() - startedMs));
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          // Only flip if still processing — guards against racing a real
          // completion that landed just before the timer fired.
          void supabase
            .from("linkedin_profiles")
            .update({ status: "failed", sync_error: "Sync timed out" })
            .eq("id", id)
            .eq("status", "processing");
        }, delay)
      );
    };

    // Arm watchdogs for syncs already processing when the hook mounts.
    void supabase
      .from("linkedin_profiles")
      .select("id, status, sync_started_at")
      .eq("profile_id", user.id)
      .eq("status", "processing")
      .then(({ data }) => {
        data?.forEach((row) => armTimer(row.id, row.sync_started_at));
      });

    const channel = supabase
      .channel(`linkedin-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "linkedin_profiles",
          filter: `profile_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as LinkedinRowPartial;
          if (row.status === "processing") {
            armTimer(row.id, row.sync_started_at);
          }
        }
      )
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

          if (next.status === "complete" || next.status === "failed") {
            clearTimer(next.id);
          } else if (next.status === "processing") {
            armTimer(next.id, next.sync_started_at);
          }

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
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      void supabase.removeChannel(channel);
    };
  }, [user, queryClient, router]);
}
