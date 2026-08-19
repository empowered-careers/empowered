"use client";

import { Calendar, GraduationCap, Play, Video } from "lucide-react";
import Link from "next/link";

import { CoachingMenu } from "@/components/coaching/coaching-menu";
import { Button } from "@/components/ui/button";
import type { Catalog } from "@/lib/catalog";
import type { MyCoaching, MyCoachingItem } from "@/lib/coaching";

/**
 * The candidate's coaching: what they've bought, what's on the calendar, and
 * what they can add. Driven entirely by `enrollments` — no plan badges, no mock
 * content.
 *
 * Layout is owned-on-top, purchasable-at-the-bottom, packages before sessions.
 * The add-more menu is `CoachingMenu`, not the marketing `PricingCatalog`.
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
  const bookable = Boolean(product.booking_url) && !isCourse;

  // The status word carries the thing the candidate scans for: is this one on
  // the calendar or not? Bundles have no calendar of their own — their parts do.
  const status = done
    ? "Completed"
    : isCourse
      ? `${enrollment.progress}% complete`
      : next
        ? "Scheduled"
        : bookable
          ? "Not scheduled"
          : isBundle(item)
            ? "Book the parts below"
            : "Booking opens soon";

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
        </span>
        <span
          className={
            next || done
              ? "ml-auto text-[10px] text-accent uppercase tracking-[0.08em]"
              : "ml-auto text-[10px] text-muted-foreground uppercase tracking-[0.08em]"
          }
        >
          {status}
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
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Grid({
  heading,
  items,
}: {
  heading: string;
  items: MyCoachingItem[];
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="font-medium text-[13px] text-foreground">{heading}</h2>
      <div className="mt-3 grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ItemCard item={item} key={item.enrollment.id} />
        ))}
      </div>
    </section>
  );
}

export function MyCoachingClient({
  catalog,
  coaching,
}: {
  catalog: Catalog;
  coaching: MyCoaching;
}) {
  const { items } = coaching;
  const owned = new Set(items.map((i) => i.enrollment.product_id));

  // Unscheduled first inside each group: the open to-do outranks the booked one.
  const byUrgency = (a: MyCoachingItem, b: MyCoachingItem) =>
    Number(a.sessions.some((s) => s.status === "scheduled")) -
    Number(b.sessions.some((s) => s.status === "scheduled"));

  const packages = items.filter(isBundle).sort(byUrgency);
  const rest = items.filter((i) => !isBundle(i)).sort(byUrgency);

  return (
    <div className="space-y-9">
      <div>
        <h1 className="font-display font-medium text-3xl tracking-tight">
          My Coaching
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {items.length === 0
            ? "Coaching is à la carte — start with a single session, or take a full arc. No subscription."
            : "Everything you've bought, and what's on the calendar."}
        </p>
      </div>

      <Grid heading="Your packages" items={packages} />
      <Grid heading="Your sessions" items={rest} />

      <CoachingMenu catalog={catalog} ownedProductIds={owned} />
    </div>
  );
}
