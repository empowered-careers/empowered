import { NextResponse } from "next/server";
import { z } from "zod";

import {
  extractPdfText,
  parseLinkedInExport,
} from "@/lib/pdf-extract";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database.types";

const BodySchema = z.object({
  profileId: z.uuid(),
  storageObjectPath: z.string().min(1),
});

const LINKEDIN_EXPORTS_BUCKET = "linkedin-exports";

function computeProfileScore(input: {
  hasUrl: boolean;
  hasHeadline: boolean;
  hasSummary: boolean;
  experienceCount: number;
  educationCount: number;
}): number {
  let score = 0;
  if (input.hasUrl) score += 20;
  if (input.hasHeadline) score += 20;
  if (input.hasSummary) score += 20;
  if (input.experienceCount > 0) score += 20;
  if (input.educationCount > 0) score += 20;
  return score;
}

export async function POST(req: Request) {
  let profileId: string;
  let storageObjectPath: string;
  try {
    const json = await req.json();
    const parsed = BodySchema.parse(json);
    profileId = parsed.profileId;
    storageObjectPath = parsed.storageObjectPath;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: row, error: fetchError } = await supabase
    .from("linkedin_profiles")
    .select("id, profile_id, linkedin_url, headline")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (fetchError || !row) {
    return NextResponse.json(
      { ok: false, error: "linkedin_profiles row not found" },
      { status: 200 }
    );
  }

  // Idempotent: caller already flips to 'processing', but a direct call to
  // this route should still mark the job started.
  await supabase
    .from("linkedin_profiles")
    .update({ status: "processing", sync_started_at: new Date().toISOString() })
    .eq("id", row.id);

  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from(LINKEDIN_EXPORTS_BUCKET)
      .download(storageObjectPath);

    if (downloadError || !file) {
      throw new Error(downloadError?.message ?? "PDF download failed");
    }

    const buffer = await file.arrayBuffer();
    const { text } = await extractPdfText(buffer);
    const { summary, experience, education } = parseLinkedInExport(text);

    const profileScore = computeProfileScore({
      hasUrl: Boolean(row.linkedin_url),
      hasHeadline: Boolean(row.headline),
      hasSummary: Boolean(summary && summary.length >= 50),
      experienceCount: experience.length,
      educationCount: education.length,
    });

    const rawJson: Json = {
      summary,
      experience: experience as unknown as Json,
      education: education as unknown as Json,
      extractedAt: new Date().toISOString(),
      sourcePath: storageObjectPath,
    };

    const { error: updateError } = await supabase
      .from("linkedin_profiles")
      .update({
        status: "complete",
        summary,
        profile_score: profileScore,
        raw_json: rawJson,
        synced_at: new Date().toISOString(),
        sync_error: null,
      })
      .eq("id", row.id);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ ok: true, profileScore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("linkedin_profiles")
      .update({ status: "failed", sync_error: message })
      .eq("id", row.id);
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
