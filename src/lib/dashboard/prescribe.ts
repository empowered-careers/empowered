import type { CoachingProductKind } from "@/types/db";

/**
 * Gap → product prescription engine (pivot brief §6).
 *
 * Given what we know about a candidate — Blueprint dimensions, resume score, the
 * gap summary from their last JD check — pick the one product most likely to help
 * and say why.
 *
 * **Rules, not an LLM.** Same reasoning as the matching spec: this is a
 * ranking-and-explanation problem over a fixed 11-row catalog, and a rules table
 * is auditable, free, and instant. Promote to LLM-assisted only if the rules
 * demonstrably misfire.
 *
 * Rules match on product **name**, not id, so the seeded catalog can be edited in
 * admin without a code change. A rule whose product isn't in the catalog is
 * skipped rather than shown as a dead CTA.
 */

export interface PrescriptionSignals {
  /** Blueprint dimensions, 0–100. Absent when the Blueprint isn't taken. */
  scores: {
    role_clarity_score?: number | null;
    communication_score?: number | null;
    leadership_score?: number | null;
    strengths_score?: number | null;
    impact_score?: number | null;
    values_score?: number | null;
    mindset_score?: number | null;
  } | null;
  /** Current resume's job-agnostic score, 0–100. */
  resumeScore: number | null;
  /** LinkedIn profile score, 0–100. */
  linkedinScore: number | null;
  /** Latest JD check's ATS score, 0–100. */
  atsScore: number | null;
  /** Product names the candidate already owns — never prescribe these. */
  owned: string[];
}

export interface CatalogOption {
  id: string;
  name: string;
  kind: CoachingProductKind;
  price_cents: number | null;
}

export interface Prescription {
  productId: string;
  productName: string;
  /** Why this candidate, in their own terms. Shown verbatim. */
  reason: string;
  /** Higher wins. Ties break on catalog order. */
  priority: number;
}

/** A weakness below this is worth acting on. */
const WEAK = 60;

interface Rule {
  /** Exact `coaching_products.name` this rule recommends. */
  product: string;
  priority: number;
  /** Returns the reason when the rule fires, null when it doesn't. */
  test: (s: PrescriptionSignals) => string | null;
}

// Ordered by how sharply the signal points at the product. First match wins per
// product; the highest-priority match overall is what gets shown.
const RULES: Rule[] = [
  {
    product: "Resume Refresh",
    priority: 90,
    test: (s) =>
      s.resumeScore !== null && s.resumeScore < 70
        ? `Your resume scores ${s.resumeScore}/100. A working session rebuilds it around impact instead of duties.`
        : null,
  },
  {
    product: "Resume Refresh",
    priority: 70,
    test: (s) =>
      s.atsScore !== null && s.atsScore < 60
        ? `Your last job-description match came back at ${s.atsScore}/100 — the resume isn't carrying your evidence.`
        : null,
  },
  {
    product: "LinkedIn Glow-Up",
    priority: 80,
    test: (s) =>
      s.linkedinScore !== null && s.linkedinScore < 70
        ? `Your LinkedIn scores ${s.linkedinScore}/100, so recruiters searching your skills aren't finding you.`
        : null,
  },
  {
    product: "NorthStar Discovery",
    priority: 85,
    test: (s) =>
      weak(s.scores?.role_clarity_score)
        ? "Your Blueprint puts role clarity as your weakest dimension — worth settling what you're actually aiming at before polishing anything."
        : null,
  },
  {
    product: "NorthStar Discovery",
    priority: 60,
    test: (s) =>
      weak(s.scores?.values_score)
        ? "Your Blueprint shows your values aren't steering your search yet. This session names the non-negotiables."
        : null,
  },
  {
    product: "Mock Interview",
    priority: 75,
    test: (s) =>
      weak(s.scores?.communication_score)
        ? "Communication is your lowest Blueprint dimension. A live-fire mock with a real debrief is the fastest fix."
        : null,
  },
  {
    product: "Market Intel Session",
    priority: 55,
    test: (s) =>
      weak(s.scores?.impact_score)
        ? "Your impact signals read thin. Knowing what your market actually rewards tells you which wins to lead with."
        : null,
  },
  {
    product: "Executive Bio",
    priority: 50,
    // The one rule that fires on a strength rather than a gap.
    test: (s) =>
      (s.scores?.leadership_score ?? 0) >= 80
        ? "Your leadership dimension is strong — a board-ready bio puts it in front of the people who hire at that level."
        : null,
  },
];

function weak(score: number | null | undefined): boolean {
  return typeof score === "number" && score < WEAK;
}

/**
 * The single best next product, or null when nothing in the catalog is a
 * defensible recommendation. Returning null is a real outcome — a candidate with
 * good scores and no gaps should not be sold at.
 */
export function prescribe(
  signals: PrescriptionSignals,
  catalog: CatalogOption[]
): Prescription | null {
  const byName = new Map(catalog.map((p) => [p.name, p]));
  const owned = new Set(signals.owned);

  let best: Prescription | null = null;
  for (const rule of RULES) {
    if (owned.has(rule.product)) continue;
    const product = byName.get(rule.product);
    if (!product) continue; // renamed or deactivated in admin — skip, don't dead-link
    const reason = rule.test(signals);
    if (!reason) continue;
    if (!best || rule.priority > best.priority) {
      best = {
        productId: product.id,
        productName: product.name,
        reason,
        priority: rule.priority,
      };
    }
  }
  return best;
}
