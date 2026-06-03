import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RegistrationForm } from "@/components/events/registration-form";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { siteConfig, siteUrl } from "@/config/site";
import {
  eventTypeLabel,
  formatEventDateLong,
  normalizeSource,
} from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/types/db";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ src?: string; ref?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("title, subtitle, cover_image_url, is_published")
    .eq("slug", slug)
    .maybeSingle();

  const canonical = `/events/${slug}`;
  if (!data || !data.is_published) {
    return { title: "Event", alternates: { canonical } };
  }

  const ogImage =
    data.cover_image_url ??
    `/api/og?title=${encodeURIComponent(data.title)}${
      data.subtitle ? `&description=${encodeURIComponent(data.subtitle)}` : ""
    }`;

  return {
    title: data.title,
    description: data.subtitle ?? undefined,
    alternates: { canonical },
    openGraph: {
      title: data.title,
      description: data.subtitle ?? undefined,
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630, alt: data.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description: data.subtitle ?? undefined,
      images: [ogImage],
    },
  };
}

export default async function EventLandingPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { src, ref } = await searchParams;
  const source = normalizeSource(src);

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  const event = data as EventRow | null;
  if (!event) notFound();

  const isPast = event.is_past;

  const startDate = new Date(event.scheduled_at);
  const endDate = new Date(
    startDate.getTime() + event.duration_min * 60 * 1000
  );
  const eventUrl = `${siteUrl}/events/${event.slug}`;
  const eventImage =
    event.cover_image_url ??
    `${siteUrl}/api/og?title=${encodeURIComponent(event.title)}${
      event.subtitle ? `&description=${encodeURIComponent(event.subtitle)}` : ""
    }`;

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.subtitle ?? event.description ?? undefined,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "VirtualLocation",
      url: eventUrl,
    },
    organizer: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteUrl,
    },
    performer: {
      "@type": "Person",
      name: event.host_name,
    },
    image: eventImage,
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: eventUrl,
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      <JsonLd data={eventJsonLd} />
      <Link
        href="/events"
        className="text-[12px] text-muted-foreground hover:text-foreground"
      >
        ← All sessions
      </Link>

      <header className="mt-6 space-y-3">
        <p className="text-[12px] uppercase tracking-wide text-muted-foreground">
          {eventTypeLabel[event.event_type]} · {event.host_name}
        </p>
        <h1 className="font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
          {event.title}
        </h1>
        {event.subtitle && (
          <p className="text-lg text-muted-foreground">{event.subtitle}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {formatEventDateLong(event.scheduled_at)} · {event.duration_min} min
        </p>
      </header>

      {event.cover_image_url && (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden border border-border bg-muted">
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            className="object-cover"
            priority
            unoptimized
          />
        </div>
      )}

      <section className="mt-10 grid gap-10 md:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {event.description && (
            <div className="prose prose-sm max-w-none whitespace-pre-line text-foreground/90">
              {event.description}
            </div>
          )}

          {isPast && event.replay_url && (
            <div className="border border-border bg-card p-5">
              <h3 className="mb-2 font-medium">Watch the replay</h3>
              <Button asChild>
                <a
                  href={event.replay_url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Open replay →
                </a>
              </Button>
            </div>
          )}
        </div>

        <aside className="border border-border bg-card p-5">
          {isPast ? (
            <div className="space-y-3">
              <h3 className="font-medium">This session has happened.</h3>
              <p className="text-sm text-muted-foreground">
                Sign up to get your free ATS score and access exclusive roles
                Lauren&apos;s candidates see first.
              </p>
              <Button asChild className="w-full">
                <Link href="/signup">Get your free ATS score →</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-medium">Save your seat</h3>
              <RegistrationForm
                eventId={event.id}
                slug={event.slug}
                source={source}
                sourceRef={ref ?? null}
              />
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
