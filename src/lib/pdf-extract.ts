/**
 * Shared PDF text extraction used by both `/api/parse-resume` and
 * `/api/sync-linkedin`. Both routes hand off a downloaded PDF `Blob` / `ArrayBuffer`
 * and receive plain text back; the LinkedIn route then runs `parseLinkedInExport`
 * over the text to pull out summary / experience / education.
 *
 * TODO: replace the stub with a real extractor. Recommended: `unpdf` (serverless,
 * works on the Vercel edge) or `pdf-parse` (Node-only). Install one, then:
 *
 *   import { extractText, getDocumentProxy } from "unpdf";
 *   const pdf = await getDocumentProxy(new Uint8Array(buffer));
 *   const { text } = await extractText(pdf, { mergePages: true });
 *   return text;
 */

export type PdfExtractResult = {
  text: string;
  pageCount: number;
};

export async function extractPdfText(
  _buffer: ArrayBuffer
): Promise<PdfExtractResult> {
  return {
    text: "[stub: install unpdf or pdf-parse and wire up extractText() here]",
    pageCount: 0,
  };
}

/**
 * Heuristic parser for LinkedIn's "Save to PDF" export. The export is highly
 * structured (section headings `Summary`, `Experience`, `Education`, `Skills`,
 * with consistent dividers), so once we have real text from `extractPdfText`
 * we can slice by heading.
 */
export type LinkedInEntry = {
  line1: string;
  line2: string;
  line3: string;
};

export type LinkedInExportFields = {
  summary: string | null;
  experience: LinkedInEntry[];
  education: LinkedInEntry[];
};

export function parseLinkedInExport(text: string): LinkedInExportFields {
  // TODO: replace once `extractPdfText` returns real content. Section markers
  // are predictable: "Summary\n", "Experience\n", "Education\n", "Skills\n".
  if (!text || text.startsWith("[stub:")) {
    return { summary: null, experience: [], education: [] };
  }

  const sections = splitSections(text);
  return {
    summary: sections.summary?.trim() || null,
    experience: parseEntries(sections.experience),
    education: parseEntries(sections.education),
  };
}

function splitSections(text: string): Record<string, string> {
  const headers = ["Summary", "Experience", "Education", "Skills", "Languages"];
  const positions = headers
    .map((h) => ({ h, i: text.indexOf(`\n${h}\n`) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i);

  const out: Record<string, string> = {};
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].i + positions[i].h.length + 2;
    const end = i + 1 < positions.length ? positions[i + 1].i : text.length;
    out[positions[i].h.toLowerCase()] = text.slice(start, end);
  }
  return out;
}

function parseEntries(block: string | undefined): LinkedInEntry[] {
  if (!block) return [];
  // Each entry on LinkedIn PDF exports occupies a few lines. Without a real
  // parser we keep this conservative — return one entry per non-empty paragraph.
  return block
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [line1 = "", line2 = "", line3 = ""] = p.split("\n");
      return { line1, line2, line3 };
    });
}
