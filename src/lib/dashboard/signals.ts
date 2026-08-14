import type { StaleEnrollment } from "@/lib/dashboard/nudges";
import {
  type CatalogOption,
  prescribe,
  type Prescription,
} from "@/lib/dashboard/prescribe";
import { createClient } from "@/lib/supabase/server";
import type { CoachingProductKind } from "@/types/db";

/**
 * Gathers what the prescription engine and the re-engagement nudge need, in one
 * place, so `dashboard/page.tsx` stays a list of fetches rather than a pile of
 * derivation.
 */

/** An enrollment untouched for this long is worth a nudge (brief §6). */
const STALE_ENROLLMENT_DAYS = 7;

export interface DashboardSignals {
  prescription: Prescription | null;
  staleEnrollment: StaleEnrollment | null;
}

export async function fetchDashboardSignals(
  profileId: string,
  resumeScore: number | null,
  linkedinScore: number | null
): Promise<DashboardSignals> {
  const supabase = await createClient();

  const [
    { data: scores },
    { data: latestJd },
    { data: enrollments },
    { data: catalog },
  ] = await Promise.all([
    supabase
      .from("candidate_scores")
      .select(
        "role_clarity_score, communication_score, leadership_score, strengths_score, impact_score, values_score, mindset_score"
      )
      .eq("profile_id", profileId)
      .maybeSingle(),
    supabase
      .from("jds")
      .select("ats_score")
      .eq("profile_id", profileId)
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("enrollments")
      .select(
        "product_id, status, progress, granted_at, product:coaching_products(name, kind)"
      )
      .eq("profile_id", profileId),
    supabase
      .from("coaching_products")
      .select("id, name, kind, price_cents")
      .eq("is_active", true),
  ]);

  const owned: string[] = [];
  let staleEnrollment: StaleEnrollment | null = null;
  const cutoff = Date.now() - STALE_ENROLLMENT_DAYS * 24 * 60 * 60 * 1000;

  for (const row of enrollments ?? []) {
    const product = Array.isArray(row.product) ? row.product[0] : row.product;
    if (product?.name) owned.push(product.name);

    // Only courses have a meaningful "unstarted" state — a session's progress
    // never moves, so a booked-but-not-yet-held session isn't stale.
    const unstarted =
      row.status === "active" &&
      row.progress === 0 &&
      product?.kind === "course" &&
      new Date(row.granted_at).getTime() < cutoff;
    if (unstarted && !staleEnrollment && product?.name) {
      staleEnrollment = {
        productId: row.product_id,
        productName: product.name,
        grantedAt: row.granted_at,
      };
    }
  }

  const prescription = prescribe(
    {
      scores: scores ?? null,
      resumeScore,
      linkedinScore,
      atsScore: latestJd?.ats_score ?? null,
      owned,
    },
    ((catalog ?? []) as CatalogOption[]).filter((p) =>
      // Bundles aren't prescriptions — the engine recommends one concrete fix.
      (["session", "course", "service"] as CoachingProductKind[]).includes(
        p.kind
      )
    )
  );

  return { prescription, staleEnrollment };
}
