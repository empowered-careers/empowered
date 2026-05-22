import Link from "next/link";

import { eventTypeLabel, formatEventDate } from "@/lib/events";
import type { EventCardFields } from "@/types/db";

interface EventCardProps {
  event: EventCardFields;
  /** Forwarded to the card link as the `src` query param. */
  source?: string;
}

export function EventCard({ event, source }: EventCardProps) {
  const href = source
    ? `/events/${event.slug}?src=${source}`
    : `/events/${event.slug}`;
  const isPast = event.is_past;
  const cta = isPast
    ? event.replay_url
      ? "Watch replay →"
      : "View event →"
    : "Register free →";

  return (
    <Link
      href={href}
      className="group flex h-full flex-col gap-4 border border-border bg-card p-6 transition-colors hover:border-accent/60"
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {eventTypeLabel[event.event_type]}
        </span>
        {isPast && (
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Past
          </span>
        )}
      </div>

      <div className="flex-1">
        <h3 className="font-display text-xl font-medium tracking-tight">
          {event.title}
        </h3>
        {event.subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{event.subtitle}</p>
        )}
      </div>

      <div className="space-y-1 text-sm text-muted-foreground">
        <div>{formatEventDate(event.scheduled_at)}</div>
        <div>
          {event.host_name} · {event.duration_min} min
        </div>
      </div>

      <div className="pt-2 text-sm font-medium text-accent group-hover:underline">
        {cta}
      </div>
    </Link>
  );
}
