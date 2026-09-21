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
    // A "Save to PDF" export prints only a top-3 skills list, so a short
    // skills array says nothing about the candidate. The scorer must not
    // penalise it — the previous version of this check asserted the opposite
    // and would have locked the bug in.
    name: "short-skills-list-is-not-penalised",
    applies: (p) => p.skills.length < 5,
    passes: (_p, s) => s.dimensions.profile_completeness > 45,
  },
  {
    name: "unreadable-headline-is-not-scored",
    applies: (_p, h) => !h || h.trim().length === 0,
    passes: (_p, s) => s.dimensions.headline_quality === null,
  },
  {
    name: "absent-recommendations-are-not-penalised",
    applies: (p) => p.recommendations_received_count === null,
    passes: (_p, s) => s.dimensions.profile_completeness > 45,
  },
  {
    name: "low-dimension-caps-overall",
    applies: () => true,
    passes: (_p, s) => {
      // A null headline means "not measured", not "scored zero" — it must
      // never drag the overall down.
      const scored = Object.values(s.dimensions).filter(
        (v): v is number => v !== null
      );
      return Math.min(...scored) >= 30 || s.overall <= 75;
    },
  },
];
