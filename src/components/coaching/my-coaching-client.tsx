"use client";

import { Calendar, GraduationCap, Play, Video } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { MyCoaching, MyCoachingItem } from "@/lib/coaching";
import { cn } from "@/lib/utils";

/**
 * The candidate's coaching: what they've bought and what's booked. Driven
 * entirely by `enrollments` — no plan badges, no mock content.
 */

function formatSession(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Tag the booking link with the enrollment id.
 *
 * Every session product shares one Calendly event type, so the URL alone can't
 * say which purchase a booking belongs to — a bundle grants several session
 * enrollments and `/api/calendly/webhook` would have to drop all of them.
 * Calendly echoes `utm_content` back in the webhook payload, which resolves it.
 */
function bookingHref(bookingUrl: string, enrollmentId: string): string {
  const url = new URL(bookingUrl);
  url.searchParams.set("utm_content", enrollmentId);
  return url.toString();
}

/** A bundle is a container — its parts are the things you actually do. */
function isBundle(item: MyCoachingItem): boolean {
  return item.product.kind === "bundle";
}

function ItemCard({ item }: { item: MyCoachingItem }) {
  const { enrollment, product, sessions } = item;
  const next = sessions.find((s) => s.status === "scheduled");
  const isCourse = product.kind === "course";
  const done = enrollment.status === "completed";

  return (
    <div className="flex flex-col border border-border bg-card">
      <div className="flex items-center gap-2 border-border border-b px-4 py-2.5">
        {isCourse ? (
          <Play className="size-3.5 text-accent" />
        ) : isBundle(item) ? (
          <GraduationCap className="size-3.5 text-accent" />
        ) : (
          <Calendar className="size-3.5 text-accent" />
        )}
        <span className="text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
          {isBundle(item) ? "Bundle" : isCourse ? "Course" : "Session"}
          {done && " · Completed"}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
        <h3 className="font-medium text-[15px] text-foreground leading-snug">
          {product.name}
        </h3>
        {product.description && (
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {product.description}
          </p>
        )}

        {isCourse && (
          <div className="mt-4">
            <div className="h-[3px] bg-foreground/15">
              <div
                className="h-full bg-accent"
                style={{ width: `${enrollment.progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11.5px] text-muted-foreground">
              {enrollment.progress}% complete
            </p>
          </div>
        )}

        {next && (
          <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-foreground">
            <Video className="size-3.5 text-accent" />
            {formatSession(next.scheduled_for)}
            {next.duration_min ? ` · ${next.duration_min} min` : ""}
          </p>
        )}

        <div className="mt-auto pt-4">
          {isCourse && product.external_url ? (
            <Button asChild className="w-full" size="sm">
              <Link href={`/content/${product.id}`}>
                {enrollment.progress > 0 ? "Continue" : "Start course"}
              </Link>
            </Button>
          ) : product.booking_url ? (
            <Button asChild className="w-full" size="sm" variant="outline">
              <a
                href={bookingHref(product.booking_url, enrollment.id)}
                rel="noreferrer"
                target="_blank"
              >
                {next ? "Reschedule" : "Book your session"}
              </a>
            </Button>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              {isBundle(item)
                ? "Book the sessions below."
                : "Booking opens shortly — we'll email you."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function MyCoachingClient({ coaching }: { coaching: MyCoaching }) {
  const { items, upcoming } = coaching;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-medium text-3xl tracking-tight">
          My Coaching
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Everything you&apos;ve bought, and what&apos;s on the calendar.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="border border-border bg-card px-6 py-14 text-center">
          <GraduationCap className="mx-auto size-6 text-muted-foreground" />
          <h2 className="mt-4 font-display font-medium text-xl">
            Nothing here yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm">
            Coaching is à la carte — start with a single session, or take a full
            arc. No subscription.
          </p>
          <Button asChild className="mt-6" size="sm">
            <Link href="/pricing">See what&apos;s available</Link>
          </Button>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-9 border border-border bg-card">
              <h2 className="border-border border-b px-4 py-2.5 font-medium text-[13px]">
                Upcoming
              </h2>
              <ul>
                {upcoming.map((s) => {
                  const owner = items.find((i) =>
                    i.sessions.some((x) => x.id === s.id)
                  );
                  return (
                    <li
                      className="flex items-center justify-between border-border border-b px-4 py-3 last:border-b-0"
                      key={s.id}
                    >
                      <span className="text-[13.5px] text-foreground">
                        {owner?.product.name ?? "Coaching session"}
                      </span>
                      <span className="text-[12.5px] text-muted-foreground">
                        {formatSession(s.scheduled_for)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div
            className={cn("grid gap-3.5 md:grid-cols-2 lg:grid-cols-3", "mb-9")}
          >
            {items.map((item) => (
              <ItemCard item={item} key={item.enrollment.id} />
            ))}
          </div>

          <div className="border-t border-border pt-5">
            <Button asChild size="sm" variant="ghost">
              <Link href="/pricing">Add another session →</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
