import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { formatEventDateLong } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const metadata = {
  title: "You're registered",
};

/** Build Google Calendar event-add URL for a one-click "Add to calendar" button. */
function buildGoogleCalendarUrl(opts: {
  title: string;
  description: string;
  startIso: string;
  durationMin: number;
}): string {
  const start = new Date(opts.startIso);
  const end = new Date(start.getTime() + opts.durationMin * 60_000);
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: opts.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default async function EventConfirmedPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("title, subtitle, scheduled_at, duration_min, slug, is_published")
    .eq("slug", slug)
    .maybeSingle();

  if (!data || !data.is_published) notFound();

  const gcalUrl = buildGoogleCalendarUrl({
    title: data.title,
    description:
      data.subtitle ?? "Live session with Lauren · Empowered Careers",
    startIso: data.scheduled_at,
    durationMin: data.duration_min,
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
      <p className="text-[12px] uppercase tracking-wide text-muted-foreground">
        Empowered Careers
      </p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-tight">
        You&apos;re in.
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        Check your inbox for the join link — we&apos;ll also send a reminder one
        hour before {data.title}.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatEventDateLong(data.scheduled_at)}
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <a href={gcalUrl} target="_blank" rel="noreferrer noopener">
            Add to Google Calendar
          </a>
        </Button>
      </div>

      <section className="mt-14 border border-border bg-card p-6">
        <h2 className="font-display text-2xl font-medium tracking-tight">
          While you wait — see what Lauren&apos;s candidates get.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Get your free ATS score before the session. Takes 2 minutes. Bring
          your score to the webinar and Lauren can speak to it live.
        </p>
        <div className="mt-5">
          <Button asChild>
            <Link href="/signup">Get your free ATS score →</Link>
          </Button>
        </div>
      </section>

      <section className="mt-10 border border-dashed border-border p-6">
        <h3 className="font-medium">Know someone who should be here?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Forward this link — a Director or VP in your network will thank you.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <a
            className="text-accent hover:underline"
            target="_blank"
            rel="noreferrer noopener"
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
              `https://empowered-careers.com/events/${slug}?src=referral`
            )}`}
          >
            Share on LinkedIn →
          </a>
          <a
            className="text-accent hover:underline"
            target="_blank"
            rel="noreferrer noopener"
            href={`https://wa.me/?text=${encodeURIComponent(
              `Thought you'd want to see this: https://empowered-careers.com/events/${slug}?src=referral`
            )}`}
          >
            Share on WhatsApp →
          </a>
        </div>
      </section>
    </div>
  );
}
