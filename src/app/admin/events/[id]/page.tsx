import Link from "next/link";
import { notFound } from "next/navigation";

import { BulkAttendForm } from "@/components/admin/bulk-attend-form";
import { ChannelLinks } from "@/components/admin/channel-links";
import { siteUrl } from "@/config/site";
import { eventTypeLabel, formatEventDateLong } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import type { EventRow, LeadRow } from "@/types/db";

export const metadata = {
  title: "Admin · Event detail",
  robots: { index: false, follow: false },
};

type RegistrantFields = Pick<
  LeadRow,
  | "id"
  | "email"
  | "full_name"
  | "source"
  | "registered_at"
  | "attended_at"
  | "converted_at"
>;

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: eventData } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const event = eventData as EventRow | null;
  if (!event) notFound();

  const { data: leadData } = await supabase
    .from("leads")
    .select(
      "id, email, full_name, source, registered_at, attended_at, converted_at"
    )
    .eq("event_id", event.id)
    .order("registered_at", { ascending: false });

  const leads = (leadData ?? []) as RegistrantFields[];
  const registered = leads.length;
  const attended = leads.filter((l) => l.attended_at).length;
  const converted = leads.filter((l) => !!l.converted_at).length;

  const status = event.is_past ? "Past" : event.is_published ? "Live" : "Draft";

  const pct = (n: number, d: number) =>
    d === 0 ? "—" : `${Math.round((n / d) * 100)}%`;

  return (
    <div className="space-y-10 px-10 py-8">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/events"
            className="text-[12px] text-muted-foreground hover:text-foreground"
          >
            ← All events
          </Link>
          <h1 className="mt-2 font-display font-medium text-2xl tracking-tight">
            {event.title}
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {eventTypeLabel[event.event_type]} ·{" "}
            {formatEventDateLong(event.scheduled_at)} · {status}
          </p>
        </div>
        <Link
          href={`/admin/events/${event.id}/edit`}
          className="text-sm text-accent hover:underline"
        >
          Edit event
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Tile label="Registered" value={registered} />
        <Tile
          label="Attended"
          value={attended}
          sub={`${pct(attended, registered)} of registered`}
        />
        <Tile
          label="Converted to platform"
          value={converted}
          sub={`${pct(converted, attended || registered)} of ${attended ? "attended" : "registered"}`}
        />
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">Channel share links</h2>
        <div className="border border-border bg-card p-5">
          <ChannelLinks baseUrl={siteUrl} slug={event.slug} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">Mark attendance (bulk)</h2>
        <div className="border border-border bg-card p-5">
          <BulkAttendForm eventId={event.id} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">Registrants ({registered})</h2>
        <div className="overflow-hidden border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Registered</th>
                <th className="px-4 py-2 font-medium">Attended</th>
                <th className="px-4 py-2 font-medium">Converted</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-2">{l.email}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {l.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {l.source}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(l.registered_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {l.attended_at ? "✓" : "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {l.converted_at ? "✓" : "—"}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No registrants yet.
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

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="border border-border bg-card p-5">
      <div className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-2 font-display font-medium text-3xl tracking-tight">
        {value}
      </div>
      {sub && <div className="mt-1 text-muted-foreground text-xs">{sub}</div>}
    </div>
  );
}
