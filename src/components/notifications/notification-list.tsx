"use client";

import Link from "next/link";

import { NotificationItem } from "@/components/notifications/notification-item";
import { Button } from "@/components/ui/button";
import type { Notification } from "@/types/db";

export interface NotificationListProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate?: () => void;
}

export function NotificationList({
  notifications,
  unreadCount,
  isLoading,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}: NotificationListProps) {
  return (
    <div className="flex w-[360px] flex-col">
      <div className="flex items-center justify-between border-border border-b px-4 py-3">
        <span className="font-medium text-[13px] text-foreground">
          Notifications
        </span>
        {unreadCount > 0 && (
          <button
            className="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            onClick={onMarkAllRead}
            type="button"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-[360px] divide-y divide-border overflow-y-auto">
        {isLoading ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
            Loading…
          </p>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
            You&apos;re all caught up.
          </p>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={onMarkRead}
              onNavigate={onNavigate}
            />
          ))
        )}
      </div>

      <div className="border-border border-t p-1">
        <Button
          asChild
          className="w-full justify-center text-[12.5px]"
          size="sm"
          variant="ghost"
        >
          <Link href="/notifications" onClick={onNavigate}>
            View all
          </Link>
        </Button>
      </div>
    </div>
  );
}
