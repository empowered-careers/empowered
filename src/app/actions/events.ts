"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-role";
import { fireLeadAttended, fireLeadRegistered } from "@/lib/loops/client";
import { createClient } from "@/lib/supabase/server";
import type { EventType } from "@/types/db";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ---- Admin: events CRUD --------------------------------------------------

export interface EventInput {
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  event_type: EventType;
  host_name?: string;
  scheduled_at: string;
  duration_min?: number;
  max_seats?: number | null;
  cover_image_url?: string | null;
  replay_url?: string | null;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function createEvent(
  input: EventInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdmin();
  if (!SLUG_RE.test(input.slug))
    return {
      ok: false,
      error: "Slug must be lowercase letters, numbers, and hyphens.",
    };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert(input)
    .select("id, slug")
    .single<{ id: string; slug: string }>();

  if (error || !data)
    return { ok: false, error: error?.message ?? "Insert failed." };

  revalidatePath("/admin/events");
  revalidatePath("/events");
  return { ok: true, data };
}

export async function updateEvent(
  id: string,
  input: Partial<EventInput> & {
    is_published?: boolean;
    is_past?: boolean;
  }
): Promise<ActionResult> {
  await requireAdmin();
  if (input.slug !== undefined && !SLUG_RE.test(input.slug))
    return {
      ok: false,
      error: "Slug must be lowercase letters, numbers, and hyphens.",
    };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  revalidatePath(`/admin/events/${id}/edit`);
  revalidatePath("/events");
  if (input.slug) revalidatePath(`/events/${input.slug}`);
  return { ok: true };
}

export async function setEventPublished(
  id: string,
  isPublished: boolean
): Promise<ActionResult> {
  return updateEvent(id, { is_published: isPublished });
}

export async function setEventPast(
  id: string,
  isPast: boolean
): Promise<ActionResult> {
  return updateEvent(id, { is_past: isPast });
}

// ---- Public: registration (called from /api/events/register, also exported
// as a server action for direct form posts from the landing page) ---------

export interface RegisterLeadInput {
  eventId: string;
  email: string;
  firstName?: string;
  source: string;
  sourceRef?: string | null;
}

export async function registerLead(
  input: RegisterLeadInput
): Promise<ActionResult<{ leadId: string; alreadyRegistered: boolean }>> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@"))
    return { ok: false, error: "Enter a valid email." };

  const supabase = await createClient();

  // Validate event is real, published, not past.
  const { data: event } = await supabase
    .from("events")
    .select("id, slug, title, scheduled_at, is_published, is_past, max_seats")
    .eq("id", input.eventId)
    .maybeSingle();

  if (!event || !event.is_published)
    return { ok: false, error: "Event is not open for registration." };
  if (event.is_past)
    return { ok: false, error: "This event has already happened." };

  // Seat cap check (best-effort — races possible without a transaction).
  if (event.max_seats != null) {
    const { count } = await supabase
      .from("leads")
      .select("id", { head: true, count: "exact" })
      .eq("event_id", event.id);
    if ((count ?? 0) >= event.max_seats)
      return { ok: false, error: "This event is fully booked." };
  }

  // Idempotent upsert on (email, event_id) — re-registration returns the
  // same row instead of erroring on the unique constraint.
  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("email", email)
    .eq("event_id", event.id)
    .maybeSingle();

  if (existing)
    return { ok: true, data: { leadId: existing.id, alreadyRegistered: true } };

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      email,
      full_name: input.firstName?.trim() || null,
      source: input.source,
      source_ref: input.sourceRef ?? null,
      event_id: event.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertError || !lead)
    return { ok: false, error: insertError?.message ?? "Could not register." };

  // Fire Loops event. Non-blocking from the caller's POV — the wrapper
  // swallows errors internally.
  await fireLeadRegistered({
    email,
    firstName: input.firstName ?? null,
    eventSlug: event.slug,
    eventTitle: event.title,
    eventDate: event.scheduled_at,
    source: input.source,
    sourceRef: input.sourceRef ?? null,
  });

  revalidatePath(`/admin/events/${event.id}`);
  revalidatePath("/admin/leads");

  return { ok: true, data: { leadId: lead.id, alreadyRegistered: false } };
}

// ---- Admin: attendance marking -------------------------------------------

export async function markAttended(leadId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, email, attended_at, event:events(slug, title)")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { ok: false, error: "Lead not found." };
  if (lead.attended_at) return { ok: true };

  const attendedAt = new Date().toISOString();
  const { error } = await supabase
    .from("leads")
    .update({ attended_at: attendedAt })
    .eq("id", leadId);
  if (error) return { ok: false, error: error.message };

  const ev = Array.isArray(lead.event) ? lead.event[0] : lead.event;
  if (ev) {
    await fireLeadAttended({
      email: lead.email,
      eventSlug: ev.slug,
      eventTitle: ev.title,
      attendedAt,
    });
  }

  revalidatePath("/admin/leads");
  return { ok: true };
}

export interface BulkMarkAttendedInput {
  eventId: string;
  /** Newline- or comma-separated list of emails (CSV-style import from Zoom). */
  emails: string[];
}

export async function bulkMarkAttended(
  input: BulkMarkAttendedInput
): Promise<
  ActionResult<{ matched: number; alreadyMarked: number; unmatched: string[] }>
> {
  await requireAdmin();
  const supabase = await createClient();

  const normalized = Array.from(
    new Set(
      input.emails
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0)
    )
  );
  if (normalized.length === 0)
    return { ok: false, error: "Paste at least one email." };

  const { data: event } = await supabase
    .from("events")
    .select("id, slug, title")
    .eq("id", input.eventId)
    .maybeSingle();
  if (!event) return { ok: false, error: "Event not found." };

  const { data: leads } = await supabase
    .from("leads")
    .select("id, email, attended_at")
    .eq("event_id", event.id)
    .in("email", normalized);

  const matched = leads ?? [];
  const matchedEmails = new Set(matched.map((l) => l.email));
  const unmatched = normalized.filter((e) => !matchedEmails.has(e));

  const toMark = matched.filter((l) => !l.attended_at);
  const alreadyMarked = matched.length - toMark.length;

  if (toMark.length > 0) {
    const attendedAt = new Date().toISOString();
    const { error } = await supabase
      .from("leads")
      .update({ attended_at: attendedAt })
      .in(
        "id",
        toMark.map((l) => l.id)
      );
    if (error) return { ok: false, error: error.message };

    // Fire one Loops event per newly-marked lead. Sequential by design so
    // we don't open hundreds of parallel fetches; Loops calls are cheap.
    for (const lead of toMark) {
      await fireLeadAttended({
        email: lead.email,
        eventSlug: event.slug,
        eventTitle: event.title,
        attendedAt,
      });
    }
  }

  revalidatePath(`/admin/events/${event.id}`);
  revalidatePath("/admin/leads");

  return {
    ok: true,
    data: { matched: toMark.length, alreadyMarked, unmatched },
  };
}
