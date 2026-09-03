"use client";

import { useSyncExternalStore } from "react";

/**
 * Hydration-safe date rendering.
 *
 * `toLocaleDateString` / `toLocaleString` read the *runtime's* time zone — and
 * its locale, when one isn't pinned. The server renders in UTC, the visitor's
 * browser renders in their own zone, so any timestamp near midnight UTC formats
 * to a different day on each side. That text mismatch throws React #418, the
 * error boundary swallows the whole page, and every control on it goes dead —
 * the LinkedIn URL dialog, the profile Continue button, everything.
 *
 * Same root cause as the time-of-day greeting fixed in `dashboard-header.tsx`
 * (a5a8997); that patched one of four instances on the dashboard alone. Only
 * reproduces when the UTC date and the local date differ, which is why it looks
 * intermittent — US evenings hit it, UTC mornings don't.
 *
 * The server snapshot pins the zone to UTC, so the server render and the
 * hydration pass agree; React then re-reads the client snapshot and the visitor
 * sees their own local date.
 *
 * A component rather than a hook so it can be used inside `.map()`.
 */

/** Stable no-op subscription — a formatted date never needs to push updates. */
const emptySubscribe = () => () => {};

const FORMATS = {
  /** "Sep 3, 2026" */
  medium: { month: "short", day: "numeric", year: "numeric" },
  /** "Sep 3" */
  compact: { month: "short", day: "numeric" },
  /** "September 3, 2026" */
  long: { year: "numeric", month: "long", day: "numeric" },
  /** "Wednesday, Sep 3" */
  weekday: { weekday: "long", month: "short", day: "numeric" },
  /** "Wed, Sep 3, 2:52 PM" */
  datetime: {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateFormat = keyof typeof FORMATS;

/**
 * Locale is pinned to en-US on both sides. Half the call sites already pinned
 * it; the other half passed `undefined`, which is a second mismatch source
 * (Node's default locale vs the browser's). Pinning removes it.
 */
export function formatDate(
  iso: string,
  format: DateFormat,
  timeZone?: string
): string {
  return new Date(iso).toLocaleString("en-US", {
    ...FORMATS[format],
    ...(timeZone ? { timeZone } : {}),
  });
}

/** `null` for a missing or unparseable timestamp, so callers can branch on it. */
export function safeFormatDate(
  iso: string | null,
  format: DateFormat,
  timeZone?: string
): string | null {
  if (!iso) return null;
  if (Number.isNaN(new Date(iso).getTime())) return null;
  return formatDate(iso, format, timeZone);
}

export function LocalDate({
  iso,
  format = "medium",
}: {
  iso: string;
  format?: DateFormat;
}) {
  const text = useSyncExternalStore(
    emptySubscribe,
    () => formatDate(iso, format),
    () => formatDate(iso, format, "UTC")
  );
  return <>{text}</>;
}

/**
 * Hook form, for callers that need the string itself — typically to gate
 * rendering on it (`taken && <p>Taken {taken}</p>`). Obeys the rules of hooks,
 * so it can't be used inside `.map()`; use `<LocalDate>` there.
 */
export function useLocalDateOrNull(
  iso: string | null,
  format: DateFormat = "medium"
): string | null {
  return useSyncExternalStore(
    emptySubscribe,
    () => safeFormatDate(iso, format),
    () => safeFormatDate(iso, format, "UTC")
  );
}

/** Renders nothing when the timestamp is missing or unparseable. */
export function LocalDateOrNull({
  iso,
  format = "medium",
}: {
  iso: string | null;
  format?: DateFormat;
}) {
  return <>{useLocalDateOrNull(iso, format)}</>;
}
