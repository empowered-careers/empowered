/* eslint-disable no-console */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseResume } from "../../src/lib/llm/parse-resume";
import { scoreResume } from "../../src/lib/llm/score-resume";
import type { ParsedResume, Scoring } from "../../src/lib/llm/schemas";
import { loadFixtures } from "../shared/fixtures-loader";
import { writeReport } from "../shared/report";
import { RUBRIC_CHECKS } from "./rubric-checks";

type Pair = { stronger: string; weaker: string; reason: string };

async function main() {
  const fixtures = loadFixtures();
  if (fixtures.length === 0) {
    console.log("No fixtures. See evals/README.md.");
    return;
  }

  // Parse + score every fixture once.
  const cache = new Map<string, { parsed: ParsedResume; scoring: Scoring }>();
  for (const fx of fixtures) {
    console.log(`Parsing + scoring ${fx.id}…`);
    const parsed = await parseResume(fx.pdfBuffer);
    const scoring = await scoreResume(parsed);
    cache.set(fx.id, { parsed, scoring });
  }

  // Rubric checks
  const rubricResults: Array<{
    fixture: string;
    check: string;
    applied: boolean;
    passed: boolean;
  }> = [];
  for (const [id, { parsed, scoring }] of cache) {
    for (const c of RUBRIC_CHECKS) {
      const applied = c.applies(parsed);
      const passed = applied ? c.passes(parsed, scoring) : true;
      rubricResults.push({ fixture: id, check: c.name, applied, passed });
    }
  }
  const applied = rubricResults.filter((r) => r.applied);
  const rubricPassRate =
    applied.length === 0
      ? 1
      : applied.filter((r) => r.passed).length / applied.length;

  // Pairwise accuracy
  const pairsPath = join(process.cwd(), "evals/scorer/pairs.json");
  const pairs = JSON.parse(readFileSync(pairsPath, "utf-8")) as Pair[];
  let correct = 0;
  let evaluated = 0;
  const pairResults: Array<{
    stronger: string;
    weaker: string;
    strongerScore: number;
    weakerScore: number;
    correct: boolean;
  }> = [];
  for (const pair of pairs) {
    const s = cache.get(pair.stronger);
    const w = cache.get(pair.weaker);
    if (!s || !w) continue;
    evaluated += 1;
    const right = s.scoring.overall > w.scoring.overall;
    if (right) correct += 1;
    pairResults.push({
      stronger: pair.stronger,
      weaker: pair.weaker,
      strongerScore: s.scoring.overall,
      weakerScore: w.scoring.overall,
      correct: right,
    });
  }
  const pairwiseAccuracy = evaluated === 0 ? 0 : correct / evaluated;

  const summary = {
    fixtures: cache.size,
    rubricPassRate,
    rubricChecksApplied: applied.length,
    pairwiseAccuracy,
    pairsEvaluated: evaluated,
  };
  console.log("\nSummary:", summary);
  const path = writeReport("scorer", { summary, rubricResults, pairResults });
  console.log(`Report: ${path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
