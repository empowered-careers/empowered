"use client";

import {
  Award,
  Briefcase,
  CreditCard,
  FileText,
  Linkedin,
  type LucideIcon,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types/db";

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  application_status: Briefcase,
  resume_complete: FileText,
  match_created: Sparkles,
  linkedin_sync: Linkedin,
  payment_succeeded: CreditCard,
  assessment_complete: Award,
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return fmt.format(Math.round(diffSec), "second");
  if (abs < 3600) return fmt.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return fmt.format(Math.round(diffSec / 3600), "hour");
  return fmt.format(Math.round(diffSec / 86400), "day");
}

export interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onNavigate?: () => void;
}

export function NotificationItem({
  notification,
  onMarkRead,
  onNavigate,
}: NotificationItemProps) {
  const router = useRouter();
  const Icon = TYPE_ICON[notification.type as NotificationType] ?? Sparkles;
  const unread = !notification.read_at;

  const handleClick = () => {
    if (unread) onMarkRead(notification.id);
    if (notification.href) {
      router.push(notification.href);
      onNavigate?.();
    }
  };

  return (
    <button
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
        unread && "bg-accent/5"
      )}
      onClick={handleClick}
      type="button"
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
          unread ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium text-[13px] text-foreground">
            {notification.title}
          </span>
          {unread && (
            <span className="size-1.5 shrink-0 rounded-full bg-accent" />
          )}
        </span>
        {notification.body && (
          <span className="truncate text-[12.5px] text-muted-foreground">
            {notification.body}
          </span>
        )}
        <span className="text-[11px] text-muted-foreground">
          {relativeTime(notification.created_at)}
        </span>
      </span>
    </button>
  );
}
