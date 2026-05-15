import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database.types";

const BodySchema = z.object({
  resumeId: z.uuid(),
});

const ATS_KEYWORDS = [
  "leadership",
  "manage",
  "managed",
  "led",
  "team",
  "python",
  "typescript",
  "react",
  "node",
  "aws",
  "docker",
  "kubernetes",
  "architect",
  "design",
  "scale",
  "growth",
  "revenue",
  "roadmap",
  "stakeholder",
  "deliver",
];

// TODO: real PDF/DOCX extraction (pdf-parse + mammoth, or unstructured.io, or LLM)
function parseResumeStub(): { parsedText: string; parsedJson: Json } {
  return {
    parsedText: "[stub parsed text — replace with real extractor]",
    parsedJson: { stub: true },
  };
}

// TODO: real ATS scoring algorithm
function calculateAtsScoreStub(text: string): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of ATS_KEYWORDS) {
    if (lower.includes(kw)) hits += 1;
  }
  // Cheap deterministic placeholder so the badge stops showing null.
  return Math.min(100, 40 + hits * 5);
}

export async function POST(req: Request) {
  let resumeId: string;
  try {
    const json = await req.json();
    resumeId = BodySchema.parse(json).resumeId;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: resume, error: fetchError } = await supabase
    .from("resumes")
    .select("id, raw_file_url, status")
    .eq("id", resumeId)
    .maybeSingle();

  if (fetchError || !resume) {
    return NextResponse.json({ ok: false, error: "Resume not found" }, { status: 200 });
  }

  await supabase
    .from("resumes")
    .update({ status: "processing", parse_started_at: new Date().toISOString() })
    .eq("id", resumeId);

  try {
    const { parsedText, parsedJson } = parseResumeStub();
    const atsScore = calculateAtsScoreStub(parsedText);

    const { error: updateError } = await supabase
      .from("resumes")
      .update({
        status: "complete",
        parsed_text: parsedText,
        parsed_json: parsedJson,
        ats_score: atsScore,
        parsed_at: new Date().toISOString(),
        parse_error: null,
      })
      .eq("id", resumeId);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("resumes")
      .update({ status: "failed", parse_error: message })
      .eq("id", resumeId);
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
