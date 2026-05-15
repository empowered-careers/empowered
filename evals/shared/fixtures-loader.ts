import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURES_DIR = join(process.cwd(), "evals/parser/fixtures");
const GROUND_TRUTH_DIR = join(process.cwd(), "evals/parser/ground-truth");

export type ParserGroundTruth = {
  skills: string[];
  companies: string[];
  dates: Array<{ company: string; start: string | null; end: string | null }>;
  seniority_level: string | null;
  total_years_exp: number | null;
};

export type Fixture = {
  id: string;
  pdfPath: string;
  pdfBuffer: Buffer;
  groundTruth: ParserGroundTruth;
};

export function loadFixtures(): Fixture[] {
  const pdfs = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".pdf"));
  return pdfs.map((file) => {
    const id = file.replace(/\.pdf$/, "");
    const pdfPath = join(FIXTURES_DIR, file);
    const gtPath = join(GROUND_TRUTH_DIR, `${id}.json`);
    const pdfBuffer = readFileSync(pdfPath);
    const groundTruth = JSON.parse(
      readFileSync(gtPath, "utf-8")
    ) as ParserGroundTruth;
    return { id, pdfPath, pdfBuffer, groundTruth };
  });
}
