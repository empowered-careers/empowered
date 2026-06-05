"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  markAllRead as markAllReadAction,
  markNotificationRead,
} from "@/app/actions/notifications";
import { useAuth } from "@/components/providers/auth-provider";
import { queryKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types/db";

const FEED_LIMIT = 30;

/**
 * Persistent notification feed backing the top-nav bell.
 *
 * - Fetches the latest 30 rows via TanStack Query.
 * - Subscribes to `notifications` INSERTs filtered to the current user and
 *   prepends new rows to the cache (no refetch).
 * - Mark-read mutations update the source row and the cache optimistically.
 *
 * The Realtime subscription is owned by the single <RealtimeNotifications>
 * mount (`subscribe: true`, the default). The bell reads the same shared query
 * cache with `subscribe: false` so it doesn't open a duplicate channel.
 */
export function useNotificationFeed({ subscribe = true } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const feedKey = userId ? queryKeys.notifications.feed(userId) : null;

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: feedKey ?? queryKeys.notifications.feed("anon"),
    enabled: !!userId,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(FEED_LIMIT);
      if (error) throw error;
      return (data as Notification[]) ?? [];
    },
  });

  useEffect(() => {
    if (!subscribe || !userId || !feedKey) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Notification;
          queryClient.setQueryData<Notification[]>(feedKey, (prev = []) => {
            if (prev.some((n) => n.id === row.id)) return prev;
            return [row, ...prev].slice(0, FEED_LIMIT);
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [subscribe, userId, feedKey, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: (id: string) => {
      if (!feedKey) return;
      const now = new Date().toISOString();
      queryClient.setQueryData<Notification[]>(feedKey, (prev = []) =>
        prev.map((n) =>
          n.id === id && !n.read_at ? { ...n, read_at: now } : n
        )
      );
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllReadAction(),
    onMutate: () => {
      if (!feedKey) return;
      const now = new Date().toISOString();
      queryClient.setQueryData<Notification[]>(feedKey, (prev = []) =>
        prev.map((n) => (n.read_at ? n : { ...n, read_at: now }))
      );
    },
  });

  const unreadCount = notifications.reduce(
    (acc, n) => (n.read_at ? acc : acc + 1),
    0
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    markRead: (id: string) => markReadMutation.mutate(id),
    markAllRead: () => markAllReadMutation.mutate(),
  };
}
