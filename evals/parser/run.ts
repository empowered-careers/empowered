 
import { parseResume } from "../../src/lib/llm/parse-resume";
import { type Fixture, loadFixtures } from "../shared/fixtures-loader";
import { exactMatchRate, f1, writeReport } from "../shared/report";

type RowResult = {
  id: string;
  skills_f1: number;
  companies_match: number;
  dates_accuracy: number;
  seniority_match: boolean;
  years_within_2: boolean;
  error?: string;
};

async function runOne(fx: Fixture): Promise<RowResult> {
  try {
    const parsed = await parseResume(fx.pdfBuffer);
    const skills_f1 = f1(parsed.skills, fx.groundTruth.skills);
    const companies_match = exactMatchRate(
      parsed.work_experience.map((w) => w.company),
      fx.groundTruth.companies
    );
    const dates_accuracy = scoreDates(parsed.work_experience, fx.groundTruth.dates);
    const seniority_match =
      parsed.seniority_level === fx.groundTruth.seniority_level;
    const years_within_2 =
      fx.groundTruth.total_years_exp === null
        ? parsed.total_years_exp === null
        : parsed.total_years_exp !== null &&
          Math.abs(parsed.total_years_exp - fx.groundTruth.total_years_exp) <= 2;
    return {
      id: fx.id,
      skills_f1,
      companies_match,
      dates_accuracy,
      seniority_match,
      years_within_2,
    };
  } catch (err) {
    return {
      id: fx.id,
      skills_f1: 0,
      companies_match: 0,
      dates_accuracy: 0,
      seniority_match: false,
      years_within_2: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function scoreDates(
  predicted: Array<{ company: string; start: string | null; end: string | null }>,
  expected: Array<{ company: string; start: string | null; end: string | null }>
): number {
  if (expected.length === 0) return predicted.length === 0 ? 1 : 0;
  let hits = 0;
  for (const exp of expected) {
    const match = predicted.find(
      (p) => p.company.trim().toLowerCase() === exp.company.trim().toLowerCase()
    );
    if (match && match.start === exp.start && match.end === exp.end) hits += 1;
  }
  return hits / expected.length;
}

async function main() {
  const fixtures = loadFixtures();
  if (fixtures.length === 0) {
    console.log("No fixtures in evals/parser/fixtures/. See evals/README.md.");
    return;
  }
  console.log(`Running parser eval on ${fixtures.length} fixtures…`);
  const results: RowResult[] = [];
  for (const fx of fixtures) {
    const r = await runOne(fx);
    results.push(r);
    console.log(
      `  ${fx.id}: skills_f1=${r.skills_f1.toFixed(2)} companies=${r.companies_match.toFixed(2)} dates=${r.dates_accuracy.toFixed(2)} seniority=${r.seniority_match} years=${r.years_within_2}${r.error ? " ERROR: " + r.error : ""}`
    );
  }
  const n = results.length;
  const summary = {
    fixtures: n,
    skills_f1_avg: avg(results.map((r) => r.skills_f1)),
    companies_match_avg: avg(results.map((r) => r.companies_match)),
    dates_accuracy_avg: avg(results.map((r) => r.dates_accuracy)),
    seniority_accuracy: avg(results.map((r) => (r.seniority_match ? 1 : 0))),
    years_accuracy: avg(results.map((r) => (r.years_within_2 ? 1 : 0))),
    errors: results.filter((r) => r.error).length,
  };
  console.log("\nSummary:", summary);
  const path = writeReport("parser", { summary, results });
  console.log(`Report: ${path}`);
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
