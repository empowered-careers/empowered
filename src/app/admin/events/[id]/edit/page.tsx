import Link from "next/link";
import { notFound } from "next/navigation";

import { EventForm } from "@/components/admin/event-form";
import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/types/db";

export const metadata = {
  title: "Admin · Edit event",
  robots: { index: false, follow: false },
};

export default async function AdminEventEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const event = data as EventRow | null;
  if (!event) notFound();

  return (
    <div className="space-y-6 px-10 py-8">
      <Link
        href={`/admin/events/${event.id}`}
        className="text-[12px] text-muted-foreground hover:text-foreground"
      >
        ← Back to event
      </Link>

      <div>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          {event.title}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          /events/{event.slug}
        </p>
      </div>

      <div className="border border-border bg-card p-5">
        <EventForm event={event} />
      </div>
    </div>
  );
}
