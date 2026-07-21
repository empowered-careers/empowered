"use server";

import { revalidatePath } from "next/cache";

import {
  type CareerAssessmentResult,
  CATS,
} from "@/lib/assessment/career-positioning";
import {
  fireAssessmentCompleted,
  fireAssessmentStarted,
} from "@/lib/loops/client";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database.types";

import type { ActionResult } from "./events";

// Public, unauthenticated lead capture for the Career Positioning Assessment.
// Both actions write with the service client (RLS bypass) — the action body is
// the trust boundary, so inputs are validated here.
// ponytail: no rate limiting, matching the /api/events/register precedent —
// add if the endpoint gets abused.

const SOURCE_REF = "career-positioning-assessment";

export interface CaptureAssessmentLeadInput {
  email: string;
  firstName?: string;
  source: string;
  sourceRef?: string;
}

export async function captureAssessmentLead(
  input: CaptureAssessmentLeadInput
): Promise<ActionResult<{ leadId: string }>> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@"))
    return { ok: false, error: "Enter a valid email." };

  const firstName = input.firstName?.trim().slice(0, 100) || null;
  const sourceRef = input.sourceRef ?? SOURCE_REF;
  const supabase = createServiceClient();

  // Dedup by (email, source_ref): UNIQUE(email, event_id) doesn't catch
  // null-event rows, so re-taking reuses the same lead instead of duplicating.
  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("email", email)
    .eq("source_ref", sourceRef)
    .maybeSingle();

  let leadId: string;
  if (existing) {
    leadId = existing.id;
    if (firstName)
      await supabase
        .from("leads")
        .update({ full_name: firstName })
        .eq("id", leadId);
  } else {
    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        email,
        full_name: firstName,
        source: input.source,
        source_ref: sourceRef,
        event_id: null,
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !lead)
      return {
        ok: false,
        error: error?.message ?? "Could not save your email.",
      };
    leadId = lead.id;
  }

  await fireAssessmentStarted({
    email,
    firstName,
    source: input.source,
    sourceRef,
  });

  revalidatePath("/admin/leads");
  return { ok: true, data: { leadId } };
}

export interface SaveAssessmentResultInput {
  leadId: string;
  email: string;
  result: CareerAssessmentResult;
}

export async function saveAssessmentResult(
  input: SaveAssessmentResultInput
): Promise<ActionResult> {
  const email = input.email.trim().toLowerCase();
  const supabase = createServiceClient();

  // Email-pairing guards against overwriting an arbitrary lead by id.
  const { error } = await supabase
    .from("leads")
    .update({ assessment_result: input.result as unknown as Json })
    .eq("id", input.leadId)
    .eq("email", email);
  if (error) return { ok: false, error: error.message };

  await fireAssessmentCompleted({
    email,
    tier: input.result.tier.name,
    overallPct: input.result.overallPct,
    weakestArea: CATS[input.result.lowestCategory].label,
  });

  revalidatePath("/admin/leads");
  return { ok: true };
}
