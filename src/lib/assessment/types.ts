/**
 * Career Identity Blueprint — typed shapes for the runner, scoring engine, and
 * persisted display blob.
 *
 * The canonical axis taxonomy (§2.5 of docs/career-blueprint-integration.md) is
 * the single source of truth: questions vote into AxisWeights, computeAxes
 * normalises to CultureAxes, scoreBlueprint derives BlueprintResult from axes.
 */

// ────────────────────────────────────────────────────────────
// Runner I/O
// ────────────────────────────────────────────────────────────

/** questionIndex (0–29) → optionIndex (0–3) */
export type Answers = Record<number, number>;

// ────────────────────────────────────────────────────────────
// Canonical categorical axes (5-archetype model)
// ────────────────────────────────────────────────────────────

export type LeadershipStyle =
  | "vision_led"
  | "precision"
  | "empowerment"
  | "performance"
  | "strategic_systems";

export type CommunicationStyle =
  | "executive"
  | "storytelling"
  | "analytical"
  | "trusted_advisor";

export type CompanyStageKey = "startup" | "growth" | "enterprise" | "mission";
export type CultureValueKey =
  | "collaborative"
  | "innovative"
  | "results"
  | "purpose";
export type MotivationalDriver = "impact" | "growth" | "freedom" | "stability";

// ────────────────────────────────────────────────────────────
// CultureAxes — what gets persisted into candidate_scores.culture_axes.
// The future company profile will be scored on the SAME axis keys so a
// candidate↔company match is a similarity calc over shared axes.
// ────────────────────────────────────────────────────────────

export interface CultureAxes {
  // Preference axes
  company_stage_fit: Record<CompanyStageKey, number>; // distribution, sums ≈ 100
  culture_values: Record<CultureValueKey, number>; //    distribution, sums ≈ 100
  structure_vs_autonomy: number; // 0 = structure, 100 = autonomy
  pace_sustainability: number; //   0 = thrives on intensity, 100 = needs balance

  // Trait axes
  people_vs_analytical: number; // 0 = logic-led, 100 = human-led
  vision_vs_execution: number; //  0 = execution/operator, 100 = vision/builder
  external_vs_internal: number; // 0 = internal processor, 100 = external processor
  leadership_style: LeadershipStyle;
  communication_style: CommunicationStyle;

  // Driver distribution (sums ≈ 100) — surfaced via voiceProfile.top_drivers
  drivers: Record<MotivationalDriver, number>;
}

// ────────────────────────────────────────────────────────────
// Display blob — what gets persisted into assessment_responses.result and
// returned by submitBlueprint for instant client render.
// ────────────────────────────────────────────────────────────

export interface SpectrumRow {
  label_left: string;
  label_right: string;
  value: number; // 0–100
}

export interface SymmetryBar {
  label: string;
  value: number; // 0–98
}

export type BurnoutBand = "low" | "moderate" | "high";

export interface BurnoutMeter {
  band: BurnoutBand;
  title: string;
  body: string;
  pct: number; // banded display value (22 / 48 / 78)
}

export interface VoiceProfile {
  archetype: string;
  leadership_style: LeadershipStyle;
  communication_style: CommunicationStyle;
  top_drivers: MotivationalDriver[]; // 1–3 highest, in rank order
  green_light_strengths: string[]; // ≤ 4 strings
}

export interface BlueprintResult {
  archetype: { name: string; tagline: string };
  leadership: { title: string; body: string; tags: string[] };
  companyFit: { title: string; body: string; tags: string[] };
  spectrums: SpectrumRow[]; // four trait spectrums
  symmetry: SymmetryBar[]; //  six career-symmetry bars
  greenLight: string[];
  redLight: string[];
  commStyle: { title: string; body: string };
  burnout: BurnoutMeter;
  interview: string[];
  strategy: string[];
  linkedin: string[];
  overall: number; // mirrors candidate_scores.overall_score (0–100)
  voiceProfile: VoiceProfile;
}

// ────────────────────────────────────────────────────────────
// Per-option AxisWeights — internal to questions.ts + computeAxes.
// Each weight is a non-negative vote count; computeAxes normalises.
// ────────────────────────────────────────────────────────────

export interface AxisWeights {
  // Preference: company stage (distribution)
  stage_startup?: number;
  stage_growth?: number;
  stage_enterprise?: number;
  stage_mission?: number;

  // Preference: culture values (distribution)
  value_collaborative?: number;
  value_innovative?: number;
  value_results?: number;
  value_purpose?: number;

  // Preference: structure axis
  autonomy?: number;
  structure?: number;

  // Preference: pace axis
  intensity?: number;
  sustainability?: number;
  burnout_risk?: number; // also feeds the burnout meter count

  // Trait axes
  people?: number;
  analytical?: number;
  vision?: number;
  execution?: number;
  external?: number;
  internal?: number;

  // Categorical: leadership style (argmax)
  ls_vision?: number;
  ls_precision?: number;
  ls_empowerment?: number;
  ls_performance?: number;
  ls_systems?: number;

  // Categorical: communication style (argmax)
  cs_executive?: number;
  cs_storytelling?: number;
  cs_analytical?: number;
  cs_advisor?: number;

  // Motivational drivers (distribution)
  drv_impact?: number;
  drv_growth?: number;
  drv_freedom?: number;
  drv_stability?: number;
}

export interface BlueprintQuestionOption {
  label: string;
  weights: AxisWeights;
}

export type BlueprintSection =
  | "energy"
  | "leadership"
  | "culture"
  | "audit"
  | "communication"
  | "direction";

export interface BlueprintQuestion {
  section: BlueprintSection;
  text: string;
  options: BlueprintQuestionOption[]; // exactly 4
}
