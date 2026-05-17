 
import { parseLinkedIn } from "../../src/lib/llm/parse-linkedin";
import {
  type LinkedInFixture,
  loadLinkedInFixtures,
} from "../shared/fixtures-loader";
import { exactMatchRate, f1, writeReport } from "../shared/report";

type RowResult = {
  id: string;
  about_present_match: boolean;
  companies_match: number;
  dates_accuracy: number;
  skills_f1: number;
  education_match: number;
  certifications_within_1: boolean;
  error?: string;
};

async function runOne(fx: LinkedInFixture): Promise<RowResult> {
  try {
    const parsed = await parseLinkedIn(fx.pdfBuffer);
    const about_present_match =
      (!!parsed.about && parsed.about.length > 0) === fx.groundTruth.about_present;
    const companies_match = exactMatchRate(
      parsed.experience.map((e) => e.company),
      fx.groundTruth.experience_companies
    );
    const dates_accuracy = scoreDates(
      parsed.experience.map((e) => ({
        company: e.company,
        start: e.start,
        end: e.end,
      })),
      fx.groundTruth.experience_dates
    );
    const skills_f1 = f1(parsed.skills, fx.groundTruth.skills);
    const education_match = exactMatchRate(
      parsed.education.map((e) => e.school),
      fx.groundTruth.education_schools
    );
    const certifications_within_1 =
      Math.abs(
        parsed.certifications.length - fx.groundTruth.certifications_count
      ) <= 1;
    return {
      id: fx.id,
      about_present_match,
      companies_match,
      dates_accuracy,
      skills_f1,
      education_match,
      certifications_within_1,
    };
  } catch (err) {
    return {
      id: fx.id,
      about_present_match: false,
      companies_match: 0,
      dates_accuracy: 0,
      skills_f1: 0,
      education_match: 0,
      certifications_within_1: false,
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
      (p) =>
        p.company.trim().toLowerCase() === exp.company.trim().toLowerCase()
    );
    if (match && match.start === exp.start && match.end === exp.end) hits += 1;
  }
  return hits / expected.length;
}

async function main() {
  const fixtures = loadLinkedInFixtures();
  if (fixtures.length === 0) {
    console.log(
      "No fixtures in evals/linkedin-parser/fixtures/. See evals/README.md."
    );
    return;
  }
  console.log(`Running LinkedIn parser eval on ${fixtures.length} fixtures…`);
  const results: RowResult[] = [];
  for (const fx of fixtures) {
    const r = await runOne(fx);
    results.push(r);
    console.log(
      `  ${fx.id}: about=${r.about_present_match} companies=${r.companies_match.toFixed(2)} dates=${r.dates_accuracy.toFixed(2)} skills_f1=${r.skills_f1.toFixed(2)} edu=${r.education_match.toFixed(2)} certs±1=${r.certifications_within_1}${r.error ? " ERROR: " + r.error : ""}`
    );
  }
  const summary = {
    fixtures: results.length,
    about_present_accuracy: avg(
      results.map((r) => (r.about_present_match ? 1 : 0))
    ),
    companies_match_avg: avg(results.map((r) => r.companies_match)),
    dates_accuracy_avg: avg(results.map((r) => r.dates_accuracy)),
    skills_f1_avg: avg(results.map((r) => r.skills_f1)),
    education_match_avg: avg(results.map((r) => r.education_match)),
    certifications_accuracy: avg(
      results.map((r) => (r.certifications_within_1 ? 1 : 0))
    ),
    errors: results.filter((r) => r.error).length,
  };
  console.log("\nSummary:", summary);
  const path = writeReport("linkedin-parser", { summary, results });
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
