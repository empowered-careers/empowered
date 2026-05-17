/**
 * Map a 0–100 LinkedIn profile score to a letter grade.
 *
 * Why: the dashboard sidebar and `/linkedin` hero both display the score
 * as a letter (per public/mock.html, e.g. "B−"), but the database stores
 * only the numeric `profile_score`. Centralizing the mapping keeps the
 * sidebar meta + page hero in sync.
 */
export function scoreToLetterGrade(score: number | null): string {
  if (score === null) return "—";
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A−";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B−";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C−";
  if (score >= 60) return "D";
  return "F";
}
