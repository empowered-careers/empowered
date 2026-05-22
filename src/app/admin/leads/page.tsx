import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { LEAD_LIST_COLUMNS, type LeadListFields } from "@/types/db";

export const metadata = {
  title: "Admin · Leads",
  robots: { index: false, follow: false },
};

type EventLookup = Map<string, { slug: string; title: string }>;

interface PageProps {
  searchParams: Promise<{ stage?: string; source?: string; eventId?: string }>;
}

const STAGES = [
  { key: "all", label: "All" },
  { key: "registered", label: "Registered" },
  { key: "attended", label: "Attended" },
  { key: "converted", label: "Converted" },
] as const;

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const { stage = "all", source, eventId } = await searchParams;

  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select(LEAD_LIST_COLUMNS)
    .order("registered_at", { ascending: false })
    .limit(500);

  if (source) query = query.eq("source", source);
  if (eventId) query = query.eq("event_id", eventId);
  if (stage === "attended") query = query.not("attended_at", "is", null);
  if (stage === "converted") query = query.not("converted_at", "is", null);

  const { data: leadData } = await query;
  const leads = (leadData ?? []) as LeadListFields[];

  // Sidecar fetch for event slug/title; cheap join we don't need to embed.
  const eventIds = Array.from(
    new Set(leads.map((l) => l.event_id).filter((v): v is string => !!v))
  );
  let eventLookup: EventLookup = new Map();
  if (eventIds.length > 0) {
    const { data: ev } = await supabase
      .from("events")
      .select("id, slug, title")
      .in("id", eventIds);
    eventLookup = new Map(
      (ev ?? []).map((e) => [e.id, { slug: e.slug, title: e.title }])
    );
  }

  // CSV preview — just a copy hint; full export deferred until volume demands.
  return (
    <div className="space-y-10 px-10 py-8">
      <section>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Leads
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {leads.length} shown (max 500). Filter by funnel stage, source, or
          event.
        </p>
      </section>

      <section className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Stage:</span>
        {STAGES.map((s) => {
          const active = stage === s.key;
          const href = `/admin/leads?${new URLSearchParams({
            stage: s.key,
            ...(source ? { source } : {}),
            ...(eventId ? { eventId } : {}),
          }).toString()}`;
          return (
            <Link
              key={s.key}
              href={href}
              className={
                active
                  ? "rounded-md bg-accent px-3 py-1 text-accent-foreground"
                  : "rounded-md border border-border px-3 py-1 text-muted-foreground hover:text-foreground"
              }
            >
              {s.label}
            </Link>
          );
        })}
      </section>

      <section>
        <div className="overflow-hidden border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Event</th>
                <th className="px-4 py-2 font-medium">Registered</th>
                <th className="px-4 py-2 font-medium">Stage</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const stageLabel = l.converted_at
                  ? "Converted"
                  : l.attended_at
                    ? "Attended"
                    : "Registered";
                const ev = l.event_id ? eventLookup.get(l.event_id) : null;
                return (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-4 py-2">{l.email}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {l.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {l.source}
                      {l.source_ref ? ` · ${l.source_ref}` : ""}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {ev ? (
                        <Link
                          className="hover:text-foreground"
                          href={`/admin/events/${l.event_id}`}
                        >
                          {ev.title}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(l.registered_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {stageLabel}
                    </td>
                  </tr>
                );
              })}
              {leads.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No leads match this filter.
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
