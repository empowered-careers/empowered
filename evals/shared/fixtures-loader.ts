import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type GenericFixture<GT> = {
  id: string;
  pdfPath: string;
  pdfBuffer: Buffer;
  groundTruth: GT;
};

export function loadFixturesFrom<GT>(
  fixturesDir: string,
  groundTruthDir: string
): GenericFixture<GT>[] {
  const fixturesPath = join(process.cwd(), fixturesDir);
  const gtPath = join(process.cwd(), groundTruthDir);
  const pdfs = readdirSync(fixturesPath).filter((f) => f.endsWith(".pdf"));
  return pdfs.map((file) => {
    const id = file.replace(/\.pdf$/, "");
    const pdfPath = join(fixturesPath, file);
    const groundTruthFile = join(gtPath, `${id}.json`);
    const pdfBuffer = readFileSync(pdfPath);
    const groundTruth = JSON.parse(
      readFileSync(groundTruthFile, "utf-8")
    ) as GT;
    return { id, pdfPath, pdfBuffer, groundTruth };
  });
}

// ─── Resume parser ──────────────────────────────────────────

export type ParserGroundTruth = {
  skills: string[];
  companies: string[];
  dates: Array<{ company: string; start: string | null; end: string | null }>;
  seniority_level: string | null;
  total_years_exp: number | null;
};

export type Fixture = GenericFixture<ParserGroundTruth>;

export function loadFixtures(): Fixture[] {
  return loadFixturesFrom<ParserGroundTruth>(
    "evals/parser/fixtures",
    "evals/parser/ground-truth"
  );
}

// ─── LinkedIn parser ────────────────────────────────────────

export type LinkedInGroundTruth = {
  about_present: boolean;
  experience_companies: string[];
  experience_dates: Array<{
    company: string;
    start: string | null;
    end: string | null;
  }>;
  skills: string[];
  education_schools: string[];
  certifications_count: number;
  // Used by the scorer pipeline. Pass through what the user normally would
  // see in their LinkedIn search snippet.
  oauth_headline: string | null;
};

export type LinkedInFixture = GenericFixture<LinkedInGroundTruth>;

export function loadLinkedInFixtures(): LinkedInFixture[] {
  return loadFixturesFrom<LinkedInGroundTruth>(
    "evals/linkedin-parser/fixtures",
    "evals/linkedin-parser/ground-truth"
  );
}
