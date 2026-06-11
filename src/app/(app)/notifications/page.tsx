import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/types/db";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

// Stub "View all" history. The bell popover is the primary surface; this page
// is a flat, read-only log of the latest notifications. Mark-read interactions
// live in the bell for now.
export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const notifications = (data as Notification[]) ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <h1 className="mb-6 font-display font-medium text-xl tracking-tight">
        Notifications
      </h1>
      {notifications.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          You&apos;re all caught up.
        </p>
      ) : (
        <ul className="divide-y divide-border border-border border-y">
          {notifications.map((n) => (
            <li className="flex flex-col gap-0.5 py-3" key={n.id}>
              <span className="font-medium text-[13.5px] text-foreground">
                {n.title}
              </span>
              {n.body && (
                <span className="text-[13px] text-muted-foreground">
                  {n.body}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
