import type {
  LinkedInScoring,
  ParsedLinkedIn,
} from "../../src/lib/llm/schemas";

export type RubricCheck = {
  name: string;
  applies: (parsed: ParsedLinkedIn, headline: string | null) => boolean;
  passes: (
    parsed: ParsedLinkedIn,
    scoring: LinkedInScoring,
    headline: string | null
  ) => boolean;
};

export const RUBRIC_CHECKS: RubricCheck[] = [
  {
    name: "no-about-scores-low",
    applies: (p) => !p.about || p.about.length < 50,
    passes: (_p, s) => s.dimensions.about_quality <= 45,
  },
  {
    name: "fewer-than-5-skills-scores-low",
    applies: (p) => p.skills.length < 5,
    passes: (_p, s) => s.dimensions.skill_density <= 45,
  },
  {
    name: "empty-headline-scores-low",
    applies: (_p, h) => !h || h.trim().length === 0,
    passes: (_p, s) => s.dimensions.headline_quality <= 45,
  },
  {
    name: "low-dimension-caps-overall",
    applies: () => true,
    passes: (_p, s) => {
      const min = Math.min(...Object.values(s.dimensions));
      return min >= 30 || s.overall <= 75;
    },
  },
];
