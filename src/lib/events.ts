import type { EventType } from "@/types/db";

export const eventTypeLabel: Record<EventType, string> = {
  webinar: "Webinar",
  workshop: "Workshop",
  ama: "AMA",
  masterclass: "Masterclass",
};

const VALID_SOURCES = new Set([
  "linkedin",
  "email",
  "instagram",
  "newsletter",
  "direct",
  "referral",
  "other",
]);

/** Whitelist `src` query-param values so a typo'd link doesn't poison
 *  attribution data with arbitrary strings. */
export function normalizeSource(src: string | undefined | null): string {
  if (!src) return "direct";
  const lowered = src.toLowerCase();
  return VALID_SOURCES.has(lowered) ? lowered : "other";
}

/** Build a channel-tagged share link for a given event slug. */
export function buildEventUrl(
  baseUrl: string,
  slug: string,
  source: string,
  ref?: string
): string {
  const url = new URL(`/events/${slug}`, baseUrl);
  url.searchParams.set("src", source);
  if (ref) url.searchParams.set("ref", ref);
  return url.toString();
}

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

const DATE_FMT_LONG = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

export function formatEventDate(iso: string): string {
  return DATE_FMT.format(new Date(iso));
}

export function formatEventDateLong(iso: string): string {
  return DATE_FMT_LONG.format(new Date(iso));
}
