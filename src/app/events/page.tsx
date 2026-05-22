import { EventCard } from "@/components/events/event-card";
import { normalizeSource } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { EVENT_CARD_COLUMNS, type EventCardFields } from "@/types/db";

export const metadata = {
  title: "Live sessions with Lauren",
  description:
    "Free, expert-led sessions on resume strategy, interview prep, and the hiring market — hosted by Lauren Laughlin.",
};

interface PageProps {
  searchParams: Promise<{ src?: string }>;
}

export default async function EventsListingPage({ searchParams }: PageProps) {
  const { src } = await searchParams;
  const source = normalizeSource(src);

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(EVENT_CARD_COLUMNS)
    .eq("is_published", true)
    .order("scheduled_at", { ascending: true });

  const events = (data ?? []) as EventCardFields[];
  const upcoming = events.filter((e) => !e.is_past);
  const past = events.filter((e) => e.is_past);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
      <header className="mb-12 max-w-2xl">
        <p className="text-[12px] uppercase tracking-wide text-muted-foreground">
          Empowered Careers · Live
        </p>
        <h1 className="mt-3 font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
          Live sessions with Lauren — free, expert-led, no fluff.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Real coaching on resumes, interviews, and the hidden tech job market.
          Bring questions; bring your resume.
        </p>
      </header>

      <section className="mb-16">
        <h2 className="mb-5 font-display text-2xl font-medium tracking-tight">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <div className="border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
            No events scheduled yet — check back soon or follow Lauren on
            LinkedIn for the next drop.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} source={source} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-5 font-display text-2xl font-medium tracking-tight">
            Past sessions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {past.map((e) => (
              <EventCard key={e.id} event={e} source={source} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
