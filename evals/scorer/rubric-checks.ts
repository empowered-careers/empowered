import type { ParsedResume, Scoring } from "../../src/lib/llm/schemas";

export type RubricCheck = {
  name: string;
  applies: (parsed: ParsedResume) => boolean;
  passes: (parsed: ParsedResume, scoring: Scoring) => boolean;
};

export const RUBRIC_CHECKS: RubricCheck[] = [
  {
    name: "long-tenure-scores-high",
    applies: (p) =>
      p.total_years_exp !== null &&
      p.total_years_exp >= 10 &&
      averageTenureYears(p) >= 3,
    passes: (_p, s) => s.dimensions.tenure >= 70,
  },
  {
    name: "no-quantified-bullets-scores-low",
    applies: (p) =>
      p.work_experience.length > 0 && countQuantifiedBullets(p) === 0,
    passes: (_p, s) => s.dimensions.impact_signals <= 45,
  },
  {
    name: "fewer-than-5-skills-scores-low",
    applies: (p) => p.skills.length < 5,
    passes: (_p, s) => s.dimensions.skill_density <= 45,
  },
  {
    name: "low-dimension-caps-overall",
    applies: () => true,
    passes: (_p, s) => {
      const dims = Object.values(s.dimensions);
      const min = Math.min(...dims);
      return min >= 30 || s.overall <= 75;
    },
  },
];

function averageTenureYears(p: ParsedResume): number {
  const tenures: number[] = [];
  for (const role of p.work_experience) {
    if (!role.start) continue;
    const start = new Date(role.start + "-01");
    const end = role.end ? new Date(role.end + "-01") : new Date();
    const years =
      (end.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (years > 0) tenures.push(years);
  }
  if (tenures.length === 0) return 0;
  return tenures.reduce((a, b) => a + b, 0) / tenures.length;
}

function countQuantifiedBullets(p: ParsedResume): number {
  let n = 0;
  const num = /\d/;
  for (const role of p.work_experience) {
    for (const b of role.bullets) {
      if (num.test(b)) n += 1;
    }
  }
  return n;
}
