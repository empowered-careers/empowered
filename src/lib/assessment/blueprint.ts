/**
 * Career Identity Blueprint — pure scoring engine.
 *
 * Three functions:
 *   - computeAxes(answers)        → CultureAxes (the canonical, persisted shape)
 *   - scoreBlueprint(answers)     → BlueprintResult (display blob, derived from axes)
 *   - deriveCandidateScores(axes) → 6 of 8 candidate_scores numeric columns
 *
 * All deterministic, no IO. The §2.5 axes are the single source of truth;
 * everything visible in the UI is derived from them.
 *
 * Coefficient choices (sanity-checked against synthetic profiles):
 *   - Continuous trait/preference axes: 50 + 10*(pos − neg), clamped 0–100.
 *   - pace_sustainability: 50 + 10*sust − 10*intensity + 8*burnout_risk.
 *     Higher value = needs balance (rests on the "sustainability" pole).
 *   - Burnout meter band derived from raw burnout_risk count alone
 *     (matches prototype's 22 / 48 / 78 display thresholds).
 *   - Categorical axes (leadership_style, communication_style) = argmax of
 *     `ls_*` / `cs_*` counters with stable tie-break order.
 */

import {
  ARCHETYPES,
  BURNOUT_COPY,
  COMM_STYLES,
  COMPANY_FIT,
  GREEN_LIGHT_BANKS,
  INTERVIEW_LINES,
  LINKEDIN_LINES,
  RED_LIGHT_BANK,
  RED_LIGHT_DEFAULTS,
  STRATEGY_LINES,
  SYMMETRY_LABELS,
} from "./content";
import { QUESTIONS } from "./questions";
import type {
  Answers,
  AxisWeights,
  BlueprintResult,
  CommunicationStyle,
  CompanyStageKey,
  CultureAxes,
  CultureValueKey,
  LeadershipStyle,
  MotivationalDriver,
  SpectrumRow,
  SymmetryBar,
  VoiceProfile,
} from "./types";

// ────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────

const clamp = (n: number, lo = 0, hi = 100) =>
  Math.max(lo, Math.min(hi, Math.round(n)));

function tallyWeights(answers: Answers): Required<AxisWeights> {
  const totals = {
    stage_startup: 0,
    stage_growth: 0,
    stage_enterprise: 0,
    stage_mission: 0,
    value_collaborative: 0,
    value_innovative: 0,
    value_results: 0,
    value_purpose: 0,
    autonomy: 0,
    structure: 0,
    intensity: 0,
    sustainability: 0,
    burnout_risk: 0,
    people: 0,
    analytical: 0,
    vision: 0,
    execution: 0,
    external: 0,
    internal: 0,
    ls_vision: 0,
    ls_precision: 0,
    ls_empowerment: 0,
    ls_performance: 0,
    ls_systems: 0,
    cs_executive: 0,
    cs_storytelling: 0,
    cs_analytical: 0,
    cs_advisor: 0,
    drv_impact: 0,
    drv_growth: 0,
    drv_freedom: 0,
    drv_stability: 0,
  } satisfies Required<AxisWeights>;

  QUESTIONS.forEach((q, qi) => {
    const optIdx = answers[qi];
    if (optIdx === undefined) return;
    const opt = q.options[optIdx];
    if (!opt) return;
    for (const [key, val] of Object.entries(opt.weights) as [
      keyof AxisWeights,
      number,
    ][]) {
      totals[key] += val;
    }
  });

  return totals;
}

/** Normalise a vector of non-negative counters to percentages summing to 100. */
function normaliseDistribution<K extends string>(
  raw: Record<K, number>
): Record<K, number> {
  const sum = Object.values(raw).reduce<number>((a, b) => a + (b as number), 0);
  const out = {} as Record<K, number>;
  if (sum === 0) {
    const keys = Object.keys(raw) as K[];
    const even = Math.round(100 / keys.length);
    keys.forEach((k) => {
      out[k] = even;
    });
    return out;
  }
  let running = 0;
  const keys = Object.keys(raw) as K[];
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      out[k] = 100 - running; // absorb rounding drift in the last bucket
    } else {
      const pct = Math.round((raw[k] / sum) * 100);
      out[k] = pct;
      running += pct;
    }
  });
  return out;
}

function argmaxWithTieBreak<K extends string>(
  scores: Record<K, number>,
  order: K[]
): K {
  let best = order[0];
  let bestScore = scores[best];
  for (const k of order) {
    if (scores[k] > bestScore) {
      best = k;
      bestScore = scores[k];
    }
  }
  return best;
}

// ────────────────────────────────────────────────────────────
// computeAxes
// ────────────────────────────────────────────────────────────

export function computeAxes(answers: Answers): CultureAxes {
  const w = tallyWeights(answers);

  const company_stage_fit = normaliseDistribution<CompanyStageKey>({
    startup: w.stage_startup,
    growth: w.stage_growth,
    enterprise: w.stage_enterprise,
    mission: w.stage_mission,
  });

  const culture_values = normaliseDistribution<CultureValueKey>({
    collaborative: w.value_collaborative,
    innovative: w.value_innovative,
    results: w.value_results,
    purpose: w.value_purpose,
  });

  const drivers = normaliseDistribution<MotivationalDriver>({
    impact: w.drv_impact,
    growth: w.drv_growth,
    freedom: w.drv_freedom,
    stability: w.drv_stability,
  });

  const structure_vs_autonomy = clamp(50 + 10 * (w.autonomy - w.structure));
  const pace_sustainability = clamp(
    50 + 10 * w.sustainability - 10 * w.intensity + 8 * w.burnout_risk
  );
  const people_vs_analytical = clamp(50 + 10 * (w.people - w.analytical));
  const vision_vs_execution = clamp(50 + 10 * (w.vision - w.execution));
  const external_vs_internal = clamp(50 + 10 * (w.external - w.internal));

  const leadership_style = argmaxWithTieBreak<LeadershipStyle>(
    {
      vision_led: w.ls_vision,
      empowerment: w.ls_empowerment,
      performance: w.ls_performance,
      strategic_systems: w.ls_systems,
      precision: w.ls_precision,
    },
    [
      "vision_led",
      "empowerment",
      "performance",
      "strategic_systems",
      "precision",
    ]
  );

  const communication_style = argmaxWithTieBreak<CommunicationStyle>(
    {
      executive: w.cs_executive,
      storytelling: w.cs_storytelling,
      analytical: w.cs_analytical,
      trusted_advisor: w.cs_advisor,
    },
    ["executive", "storytelling", "analytical", "trusted_advisor"]
  );

  return {
    company_stage_fit,
    culture_values,
    structure_vs_autonomy,
    pace_sustainability,
    people_vs_analytical,
    vision_vs_execution,
    external_vs_internal,
    leadership_style,
    communication_style,
    drivers,
  };
}

// ────────────────────────────────────────────────────────────
// scoreBlueprint
// ────────────────────────────────────────────────────────────

function dominantStage(dist: Record<CompanyStageKey, number>): CompanyStageKey {
  return argmaxWithTieBreak<CompanyStageKey>(dist, [
    "startup",
    "growth",
    "enterprise",
    "mission",
  ]);
}

function dominantValue(dist: Record<CultureValueKey, number>): CultureValueKey {
  return argmaxWithTieBreak<CultureValueKey>(dist, [
    "purpose",
    "collaborative",
    "innovative",
    "results",
  ]);
}

function topDrivers(
  dist: Record<MotivationalDriver, number>
): MotivationalDriver[] {
  return (Object.entries(dist) as [MotivationalDriver, number][])
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v > 0)
    .slice(0, 2)
    .map(([k]) => k);
}

function burnoutFromRiskCount(burnoutRisk: number) {
  if (burnoutRisk >= 5) return BURNOUT_COPY.high;
  if (burnoutRisk >= 2) return BURNOUT_COPY.moderate;
  return BURNOUT_COPY.low;
}

function buildSpectrums(axes: CultureAxes): SpectrumRow[] {
  return [
    {
      label_left: "External Processor",
      label_right: "Internal Processor",
      value: 100 - axes.external_vs_internal,
    },
    {
      label_left: "Logic-Led",
      label_right: "Human-Led",
      value: axes.people_vs_analytical,
    },
    {
      label_left: "Adaptive Builder",
      label_right: "Structured Executor",
      value: 100 - axes.structure_vs_autonomy,
    },
    {
      label_left: "Vision Expander",
      label_right: "Stability Optimizer",
      value: 100 - axes.vision_vs_execution,
    },
  ];
}

function buildSymmetry(
  axes: CultureAxes,
  w: Required<AxisWeights>
): SymmetryBar[] {
  const dominantLs = Math.max(
    w.ls_vision,
    w.ls_empowerment,
    w.ls_performance,
    w.ls_systems,
    w.ls_precision
  );
  const values = [
    // Purpose Alignment — derived from purpose values + impact driver
    axes.culture_values.purpose +
      (axes.drivers.impact > 0 ? Math.min(20, axes.drivers.impact / 2) : 0),
    // Energy Alignment — inverse of burnout risk (lower risk = better alignment)
    100 - Math.min(60, w.burnout_risk * 10),
    // Leadership Alignment — strength of dominant leadership style
    Math.min(98, 50 + dominantLs * 8),
    // Cultural Alignment — peak of the four value buckets
    Math.max(
      axes.culture_values.collaborative,
      axes.culture_values.innovative,
      axes.culture_values.results,
      axes.culture_values.purpose
    ),
    // Growth Alignment — growth driver
    Math.min(98, 50 + axes.drivers.growth / 2),
    // Lifestyle Alignment — pace_sustainability (needs balance ↔ aligned)
    axes.pace_sustainability,
  ];

  return SYMMETRY_LABELS.map((label, i) => ({
    label,
    value: clamp(values[i], 0, 98),
  }));
}

function buildGreenLight(axes: CultureAxes): string[] {
  if (axes.vision_vs_execution >= 60) return [...GREEN_LIGHT_BANKS.vision];
  if (axes.people_vs_analytical >= 60) return [...GREEN_LIGHT_BANKS.people];
  return [...GREEN_LIGHT_BANKS.analytical];
}

function buildRedLight(w: Required<AxisWeights>, answers: Answers): string[] {
  // Map specific answer indices that vote burnout_risk into labelled drains.
  // (Q5, Q17, Q20 — index 4, 16, 19 in zero-based.)
  const labels = new Set<string>();
  if (answers[4] === 0 || answers[16] === 0) labels.add(RED_LIGHT_BANK.admin);
  if (answers[4] === 1) labels.add("Low-value meetings");
  if (answers[4] === 2 || answers[16] === 3)
    labels.add(RED_LIGHT_BANK.ambiguity);
  if (answers[4] === 3) labels.add(RED_LIGHT_BANK.political);
  if (answers[16] === 1) labels.add(RED_LIGHT_BANK.conflict);
  if (answers[16] === 2) labels.add("Repetitive execution");
  if (answers[19] === 0) labels.add(RED_LIGHT_BANK.micromanagement);
  if (answers[19] === 1) labels.add(RED_LIGHT_BANK.chaos);
  if (answers[19] === 2) labels.add("Political cultures");
  if (answers[19] === 3) labels.add(RED_LIGHT_BANK.isolation);

  const arr = Array.from(labels).slice(0, 3);
  return arr.length > 0 ? arr : [...RED_LIGHT_DEFAULTS];
}

function interviewLinesFor(axes: CultureAxes): string[] {
  if (axes.vision_vs_execution >= 60) return [...INTERVIEW_LINES.vision];
  if (axes.people_vs_analytical >= 60) return [...INTERVIEW_LINES.people];
  return [...INTERVIEW_LINES.analytical];
}

export function scoreBlueprint(answers: Answers): BlueprintResult {
  const w = tallyWeights(answers);
  const axes = computeAxes(answers);
  const derived = deriveCandidateScores(axes);

  const arch = ARCHETYPES[axes.leadership_style];
  const stage = dominantStage(axes.company_stage_fit);
  const fit = COMPANY_FIT[stage];
  const comm = COMM_STYLES[axes.communication_style];
  const burnout = burnoutFromRiskCount(w.burnout_risk);

  const greenLight = buildGreenLight(axes);
  const redLight = buildRedLight(w, answers);

  const voiceProfile: VoiceProfile = {
    archetype: arch.archetypeName,
    leadership_style: axes.leadership_style,
    communication_style: axes.communication_style,
    top_drivers: topDrivers(axes.drivers),
    green_light_strengths: greenLight,
  };

  return {
    archetype: { name: arch.archetypeName, tagline: arch.archetypeTagline },
    leadership: {
      title: arch.leadershipTitle,
      body: arch.leadershipBody,
      tags: arch.leadershipTags,
    },
    companyFit: { title: fit.title, body: fit.body, tags: fit.tags },
    spectrums: buildSpectrums(axes),
    symmetry: buildSymmetry(axes, w),
    greenLight,
    redLight,
    commStyle: comm,
    burnout: {
      band:
        w.burnout_risk >= 5 ? "high" : w.burnout_risk >= 2 ? "moderate" : "low",
      title: burnout.title,
      body: burnout.body,
      pct: burnout.pct,
    },
    interview: interviewLinesFor(axes),
    strategy: [...STRATEGY_LINES[stage]],
    linkedin: [...LINKEDIN_LINES[axes.communication_style]],
    overall: derived.overall_score,
    voiceProfile,
  };
  // Note: dominantValue is intentionally unused for now but retained as a
  // helper for future archetype refinements. See content.ts.
}

// suppress unused-import lint — kept for future use, referenced below.
void dominantValue;

// ────────────────────────────────────────────────────────────
// deriveCandidateScores
//
// Maps the canonical axes onto the five Phase-1 candidate_scores numeric
// columns + overall_score. mindset_score and communication_score remain null
// (Phase 2 per docs/db_schema.md).
// ────────────────────────────────────────────────────────────

export function deriveCandidateScores(axes: CultureAxes): {
  role_clarity_score: number;
  values_score: number;
  strengths_score: number;
  leadership_score: number;
  impact_score: number;
  overall_score: number;
} {
  // role_clarity = how concentrated the candidate's drivers are
  // (a strong single direction signal → higher clarity).
  const role_clarity_score = clamp(
    Math.max(
      axes.drivers.impact,
      axes.drivers.growth,
      axes.drivers.freedom,
      axes.drivers.stability
    ) +
      // small floor so the score never reads as zero just because drivers
      // are evenly split — clarity is "how strongly aimed", not "exclusive".
      10
  );

  // values = peak of the four value buckets (how confidently the candidate
  // identifies with one cultural mode).
  const values_score = clamp(
    Math.max(
      axes.culture_values.collaborative,
      axes.culture_values.innovative,
      axes.culture_values.results,
      axes.culture_values.purpose
    )
  );

  // strengths = how far from balanced (50) the trait axes sit; a clearly
  // expressed strength profile beats an undifferentiated one.
  const distanceFromMidpoint = (n: number) => Math.abs(n - 50) * 2;
  const strengths_score = clamp(
    Math.max(
      distanceFromMidpoint(axes.people_vs_analytical),
      distanceFromMidpoint(axes.vision_vs_execution)
    )
  );

  // leadership = strength of the winning leadership style (presence + clarity).
  // Approximated via the symmetry-style dominant-LS proxy: vision_vs_execution
  // already encodes leader-flavour; we use the people/analytical and
  // vision/execution distances together.
  const leadership_score = clamp(
    Math.round(
      (distanceFromMidpoint(axes.vision_vs_execution) +
        distanceFromMidpoint(axes.people_vs_analytical)) /
        2
    )
  );

  // impact = purpose value + impact driver (the "meaningful work" signal).
  const impact_score = clamp(
    Math.round(
      (axes.culture_values.purpose + axes.drivers.impact) / 2 +
        (axes.company_stage_fit.mission > 0
          ? axes.company_stage_fit.mission / 4
          : 0)
    )
  );

  const overall_score = clamp(
    Math.round(
      (role_clarity_score +
        values_score +
        strengths_score +
        leadership_score +
        impact_score) /
        5
    )
  );

  return {
    role_clarity_score,
    values_score,
    strengths_score,
    leadership_score,
    impact_score,
    overall_score,
  };
}
