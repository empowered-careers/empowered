"use client";

import { Bell } from "lucide-react";
import { useState } from "react";

import { NotificationList } from "@/components/notifications/notification-list";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotificationFeed } from "@/hooks/use-notification-feed";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  // subscribe: false — the single <RealtimeNotifications> mount owns the
  // Realtime channel; the bell only reads the shared query cache.
  const { notifications, unreadCount, isLoading, markRead, markAllRead } =
    useNotificationFeed({ subscribe: false });

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-label="Notifications"
          className="relative h-9 w-9"
          size="icon"
          type="button"
          variant="ghost"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="-top-0.5 -right-0.5 absolute flex min-w-4 items-center justify-center rounded-full bg-accent px-1 font-medium text-[10px] text-accent-foreground leading-4">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <NotificationList
          isLoading={isLoading}
          notifications={notifications}
          onMarkAllRead={markAllRead}
          onMarkRead={markRead}
          onNavigate={() => setOpen(false)}
          unreadCount={unreadCount}
        />
      </PopoverContent>
    </Popover>
  );
}
