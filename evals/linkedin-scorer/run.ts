 
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseLinkedIn } from "../../src/lib/llm/parse-linkedin";
import type {
  LinkedInScoring,
  ParsedLinkedIn,
} from "../../src/lib/llm/schemas";
import { scoreLinkedIn } from "../../src/lib/llm/score-linkedin";
import { loadLinkedInFixtures } from "../shared/fixtures-loader";
import { writeReport } from "../shared/report";
import { RUBRIC_CHECKS } from "./rubric-checks";

type Pair = { stronger: string; weaker: string; reason: string };

async function main() {
  const fixtures = loadLinkedInFixtures();
  if (fixtures.length === 0) {
    console.log(
      "No LinkedIn fixtures. See evals/README.md."
    );
    return;
  }

  const cache = new Map<
    string,
    {
      parsed: ParsedLinkedIn;
      scoring: LinkedInScoring;
      headline: string | null;
    }
  >();
  for (const fx of fixtures) {
    console.log(`Parsing + scoring ${fx.id}…`);
    const parsed = await parseLinkedIn(fx.pdfBuffer);
    const headline = fx.groundTruth.oauth_headline;
    const scoring = await scoreLinkedIn(parsed, headline);
    cache.set(fx.id, { parsed, scoring, headline });
  }

  // Rubric checks
  const rubricResults: Array<{
    fixture: string;
    check: string;
    applied: boolean;
    passed: boolean;
  }> = [];
  for (const [id, { parsed, scoring, headline }] of cache) {
    for (const c of RUBRIC_CHECKS) {
      const applied = c.applies(parsed, headline);
      const passed = applied ? c.passes(parsed, scoring, headline) : true;
      rubricResults.push({ fixture: id, check: c.name, applied, passed });
    }
  }
  const applied = rubricResults.filter((r) => r.applied);
  const rubricPassRate =
    applied.length === 0
      ? 1
      : applied.filter((r) => r.passed).length / applied.length;

  // Pairwise accuracy
  const pairsPath = join(process.cwd(), "evals/linkedin-scorer/pairs.json");
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
  const path = writeReport("linkedin-scorer", {
    summary,
    rubricResults,
    pairResults,
  });
  console.log(`Report: ${path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
