import type { SupabaseClient } from "@supabase/supabase-js";

import { fireLeadConverted } from "@/lib/loops/client";
import type { Database } from "@/types/database.types";

/**
 * On OAuth completion, match the new user's email against any unconverted
 * leads row. If found, stamp `converted_*` on the lead, mirror acquisition
 * fields onto the profile, and fire `lead.converted` to Loops.
 *
 * Non-blocking by design — the caller must wrap in try/catch so a Loops or
 * Supabase hiccup never gates the post-login redirect.
 */
export async function reconcileLeadForUser(
  supabase: SupabaseClient<Database>,
  user: { id: string; email?: string | null }
): Promise<void> {
  if (!user.email) return;
  const email = user.email.toLowerCase();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, source, source_ref, event:events(slug, title)")
    .eq("email", email)
    .is("converted_profile_id", null)
    .order("registered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lead) return;

  const nowIso = new Date().toISOString();

  await supabase
    .from("leads")
    .update({ converted_profile_id: user.id, converted_at: nowIso })
    .eq("id", lead.id);

  await supabase
    .from("profiles")
    .update({
      lead_id: lead.id,
      acquisition_source: lead.source,
      acquisition_ref: lead.source_ref,
    })
    .eq("id", user.id);

  const ev = Array.isArray(lead.event) ? lead.event[0] : lead.event;
  await fireLeadConverted({
    email,
    profileId: user.id,
    eventSlug: ev?.slug ?? null,
    eventTitle: ev?.title ?? null,
    source: lead.source,
    sourceRef: lead.source_ref,
  });
}
