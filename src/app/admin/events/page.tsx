import Link from "next/link";

import { EventForm } from "@/components/admin/event-form";
import { eventTypeLabel, formatEventDate } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { EVENT_LIST_COLUMNS, type EventListFields } from "@/types/db";

export const metadata = {
  title: "Admin · Events",
  robots: { index: false, follow: false },
};

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(EVENT_LIST_COLUMNS)
    .order("scheduled_at", { ascending: false });
  const events = (data ?? []) as EventListFields[];

  return (
    <div className="space-y-10 px-10 py-8">
      <section>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Events
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {events.length} total. Create an event below — it stays in draft until
          you publish.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">New event</h2>
        <div className="border border-border bg-card p-5">
          <EventForm />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">All events</h2>
        <div className="overflow-hidden border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Scheduled</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const status = ev.is_past
                  ? "Past"
                  : ev.is_published
                    ? "Live"
                    : "Draft";
                return (
                  <tr key={ev.id} className="border-t border-border">
                    <td className="px-4 py-2">{ev.title}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {eventTypeLabel[ev.event_type]}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatEventDate(ev.scheduled_at)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {status}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/admin/events/${ev.id}`}
                        className="text-accent hover:underline"
                      >
                        Open
                      </Link>
                      <span className="px-2 text-muted-foreground">·</span>
                      <Link
                        href={`/admin/events/${ev.id}/edit`}
                        className="text-accent hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
