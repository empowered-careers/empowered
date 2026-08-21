import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Golden cases: synthetic, already-parsed inputs committed to the repo.
 *
 * The parser evals need real resume PDFs, which carry PII the repo can't hold —
 * so `evals/parser/fixtures` stays empty and those suites stay local-only. The
 * scorers don't: `scoreResume` takes `ParsedResume` JSON and `scoreLinkedIn`
 * takes `ParsedLinkedIn` + a headline, so the parse step is incidental to what
 * they measure. Committing the parsed JSON directly is what makes the scorer
 * suites runnable in CI at all.
 *
 * `label.overall` is a frozen reference score, not ground truth — the metric is
 * agreement-with-reference within SCORE_TOLERANCE. Re-freeze it deliberately
 * (`--record`), never to make a red run go green.
 */
export type GoldenCase<Input> = {
  id: string;
  /** Always true here — these profiles describe nobody. */
  synthetic: boolean;
  /** What this case is meant to exercise, for the report. */
  note: string;
  input: Input;
  label: { overall: number; provenance: string };
};

/** Max |scored - label.overall| still counted as agreement, on the 0-100 scale. */
export const SCORE_TOLERANCE = 8;

export function loadGolden<Input>(dir: string): GoldenCase<Input>[] {
  const path = join(process.cwd(), dir);
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map(
      (f) =>
        JSON.parse(readFileSync(join(path, f), "utf-8")) as GoldenCase<Input>
    );
}
