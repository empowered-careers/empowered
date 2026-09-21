"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { queryKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";

type ResumeRowPartial = {
  id: string;
  status: string | null;
  profile_id: string;
  uploaded_at?: string | null;
};

// Rows stuck in a non-terminal status longer than this are force-failed, so a
// silent `inngest.send` failure (or a worker that dies without firing
// `onFailure`) doesn't leave the candidate watching a spinner forever.
// Must sit comfortably above a real parse. Two Anthropic calls plus Inngest
// queueing (concurrency limit 5) can legitimately run minutes; at the old 60s
// this watchdog would declare a healthy job dead and overwrite a parse that was
// still running.
const STALE_TIMEOUT_MS = 5 * 60_000;
const PENDING_STATUSES = ["uploading", "processing"];

export function useResumeNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  // Per-row watchdog timers, keyed by resume id.
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

    const armTimer = (id: string, uploadedAt?: string | null) => {
      if (timers.has(id)) return;
      const startedMs = uploadedAt
        ? new Date(uploadedAt).getTime()
        : Date.now();
      const delay = Math.max(0, STALE_TIMEOUT_MS - (Date.now() - startedMs));
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          // Only flip if still pending — guards against racing a real
          // completion that landed just before the timer fired.
          void supabase
            .from("resumes")
            .update({ status: "failed", parse_error: "Parsing timed out" })
            .eq("id", id)
            .in("status", PENDING_STATUSES);
        }, delay)
      );
    };

    // Arm watchdogs for rows already pending when the hook mounts.
    void supabase
      .from("resumes")
      .select("id, status, uploaded_at")
      .eq("profile_id", user.id)
      .in("status", PENDING_STATUSES)
      .then(({ data }) => {
        data?.forEach((row) => armTimer(row.id, row.uploaded_at));
      });

    const channel = supabase
      .channel(`resume-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "resumes",
          filter: `profile_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as ResumeRowPartial;
          if (row.status && PENDING_STATUSES.includes(row.status)) {
            armTimer(row.id, row.uploaded_at);
          }
        }
      )
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

          if (next.status === "complete" || next.status === "failed") {
            clearTimer(next.id);
          } else if (next.status && PENDING_STATUSES.includes(next.status)) {
            armTimer(next.id, next.uploaded_at);
          }

          // Both terminal states have to refresh the UI. Previously only
          // `processing → complete` did, so a failed row left the dashboard
          // rendering a stale pending card — and a parse that completed after
          // the watchdog had already marked it failed never showed up at all.
          const settled =
            (next.status === "complete" || next.status === "failed") &&
            prev.status !== next.status;

          if (settled) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.dashboard.byUser(user.id),
            });
            router.refresh();
          }

          if (next.status === "complete" && prev.status !== "complete") {
            toast.success("Resume parsed", {
              description: "Your Resume score is ready.",
              action: {
                label: "View",
                onClick: () => router.push("/dashboard#resume-hub"),
              },
            });
          } else if (next.status === "failed" && prev.status !== "failed") {
            toast.error("Resume parsing failed", {
              description: "Open your dashboard to retry.",
              action: {
                label: "View",
                onClick: () => router.push("/dashboard#resume-hub"),
              },
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
