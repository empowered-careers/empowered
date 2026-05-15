import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPORTS_DIR = join(process.cwd(), "evals/reports");

export function writeReport(name: string, data: unknown): string {
  mkdirSync(REPORTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = join(REPORTS_DIR, `${name}-${stamp}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2));
  return path;
}

export function f1(predicted: string[], expected: string[]): number {
  const p = new Set(predicted.map(normalize));
  const e = new Set(expected.map(normalize));
  if (p.size === 0 && e.size === 0) return 1;
  if (p.size === 0 || e.size === 0) return 0;
  let tp = 0;
  for (const x of p) if (e.has(x)) tp += 1;
  const precision = tp / p.size;
  const recall = tp / e.size;
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

export function exactMatchRate(
  predicted: string[],
  expected: string[]
): number {
  if (expected.length === 0) return predicted.length === 0 ? 1 : 0;
  const p = new Set(predicted.map(normalize));
  let hits = 0;
  for (const x of expected) if (p.has(normalize(x))) hits += 1;
  return hits / expected.length;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}
