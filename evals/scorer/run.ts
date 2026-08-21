import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { ParsedResume, Scoring } from "../../src/lib/llm/schemas";
import { loadFixtures } from "../shared/fixtures-loader";
import { loadGolden, SCORE_TOLERANCE } from "../shared/golden";
import { modeFromArgv, through } from "../shared/replay";
import { writeReport } from "../shared/report";
import { RUBRIC_CHECKS } from "./rubric-checks";

// Imported lazily: `src/lib/llm/*` pulls in env.ts, which requires the Supabase
// vars at module load. A replay run must work with no environment at all.
const llm = {
  scoreResume: () => import("../../src/lib/llm/score-resume"),
  parseResume: () => import("../../src/lib/llm/parse-resume"),
};

type Pair = { stronger: string; weaker: string; reason: string };

/** Gates. A run below any of these exits non-zero. */
const MIN_RUBRIC_PASS_RATE = 0.95;
const MIN_PAIRWISE_ACCURACY = 0.85;
const MIN_LABEL_AGREEMENT = 0.8;

async function main() {
  const mode = modeFromArgv();
  const golden = loadGolden<ParsedResume>("evals/scorer/golden");
  const pdfFixtures = loadFixtures();

  if (golden.length === 0 && pdfFixtures.length === 0) {
    console.log("No golden cases and no PDF fixtures. See evals/README.md.");
    return;
  }
  console.log(
    `mode=${mode}  golden=${golden.length}  pdfFixtures=${pdfFixtures.length}`
  );

  const cache = new Map<string, { parsed: ParsedResume; scoring: Scoring }>();
  const labels = new Map<string, number>();

  // Golden cases skip the parser: they're already the parser's output shape.
  for (const g of golden) {
    console.log(`Scoring ${g.id}…`);
    const scoring = await through(mode, "scorer", g.id, async () =>
      (await llm.scoreResume()).scoreResume(g.input)
    );
    cache.set(g.id, { parsed: g.input, scoring });
    labels.set(g.id, g.label.overall);
  }

  // Real PDFs, when someone has them locally. Never replayed — the parse is
  // part of what's under test on this path.
  for (const fx of pdfFixtures) {
    if (mode === "replay") {
      console.log(`Skipping PDF fixture ${fx.id} (replay mode).`);
      continue;
    }
    console.log(`Parsing + scoring ${fx.id}…`);
    const parsed = await (await llm.parseResume()).parseResume(fx.pdfBuffer);
    const { scoreResume } = await llm.scoreResume();
    cache.set(fx.id, { parsed, scoring: await scoreResume(parsed) });
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

  // Agreement with the frozen reference labels, within a tolerance band. The
  // metric is agreement-with-reference, not absolute correctness.
  const labelResults: Array<{
    fixture: string;
    scored: number;
    label: number;
    delta: number;
    agrees: boolean;
  }> = [];
  for (const [id, label] of labels) {
    const scored = cache.get(id)!.scoring.overall;
    const delta = scored - label;
    labelResults.push({
      fixture: id,
      scored,
      label,
      delta,
      agrees: Math.abs(delta) <= SCORE_TOLERANCE,
    });
  }
  const labelAgreement =
    labelResults.length === 0
      ? 1
      : labelResults.filter((r) => r.agrees).length / labelResults.length;

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
    mode,
    fixtures: cache.size,
    rubricPassRate,
    rubricChecksApplied: applied.length,
    labelAgreement,
    labelsCompared: labelResults.length,
    scoreTolerance: SCORE_TOLERANCE,
    pairwiseAccuracy,
    pairsEvaluated: evaluated,
  };
  console.log("\nSummary:", summary);
  const path = writeReport("scorer", {
    summary,
    rubricResults,
    labelResults,
    pairResults,
  });
  console.log(`Report: ${path}`);

  const failures = [
    rubricPassRate < MIN_RUBRIC_PASS_RATE &&
      `rubric pass rate ${rubricPassRate.toFixed(2)} < ${MIN_RUBRIC_PASS_RATE}`,
    labelAgreement < MIN_LABEL_AGREEMENT &&
      `label agreement ${labelAgreement.toFixed(2)} < ${MIN_LABEL_AGREEMENT}`,
    evaluated > 0 &&
      pairwiseAccuracy < MIN_PAIRWISE_ACCURACY &&
      `pairwise accuracy ${pairwiseAccuracy.toFixed(2)} < ${MIN_PAIRWISE_ACCURACY}`,
  ].filter((f): f is string => Boolean(f));

  if (failures.length > 0) {
    console.error("\nFAIL:\n  " + failures.join("\n  "));
    process.exit(1);
  }
  console.log("\nPASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
