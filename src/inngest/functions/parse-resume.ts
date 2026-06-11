import { NonRetriableError } from "inngest";

import {
  PARSER_MODEL,
  PROMPT_VERSION,
  SCORER_MODEL,
} from "@/lib/llm/anthropic";
import { parseResume } from "@/lib/llm/parse-resume";
import type { ParsedResume, Scoring } from "@/lib/llm/schemas";
import { scoreResume } from "@/lib/llm/score-resume";
import { createNotification } from "@/lib/notifications/create";
import { createServiceClient } from "@/lib/supabase/service";

import {
  CandidateResumeParsedEvent,
  inngest,
  ResumeUploadedEvent,
} from "../client";

type DuplicateRow = {
  parsed_json: (ParsedResume & { scoring?: Scoring }) | null;
};

export const parseResumeFn = inngest.createFunction(
  {
    id: "parse-resume",
    retries: 2,
    concurrency: { limit: 5 },
    triggers: [ResumeUploadedEvent],
    onFailure: async ({ event, error }) => {
      const inner = (event.data as { event?: { data?: { resumeId?: string } } })
        .event;
      const resumeId = inner?.data?.resumeId;
      if (!resumeId) return;
      const supabase = createServiceClient();
      await supabase
        .from("resumes")
        .update({
          status: "failed",
          parse_error: error.message.slice(0, 1000),
        })
        .eq("id", resumeId);
    },
  },
  async ({ event, step }) => {
    const { resumeId } = event.data as {
      resumeId: string;
      profileId: string;
    };
    const supabase = createServiceClient();

    const resume = await step.run("fetch-row", async () => {
      const { data, error } = await supabase
        .from("resumes")
        .select("id, profile_id, raw_file_url, file_hash")
        .eq("id", resumeId)
        .maybeSingle();
      if (error) throw new Error(`fetch-row: ${error.message}`);
      if (!data) throw new NonRetriableError(`Resume ${resumeId} not found`);
      return data;
    });

    await step.run("mark-processing", async () => {
      await supabase
        .from("resumes")
        .update({
          status: "processing",
          parse_started_at: new Date().toISOString(),
          parse_error: null,
        })
        .eq("id", resumeId);
    });

    const duplicate = await step.run("check-dedup", async () => {
      if (!resume.file_hash) return null;
      const { data } = await supabase
        .from("resumes")
        .select("parsed_json")
        .eq("profile_id", resume.profile_id)
        .eq("file_hash", resume.file_hash)
        .eq("status", "complete")
        .neq("id", resumeId)
        .order("parsed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as DuplicateRow | null) ?? null;
    });

    let parsed: ParsedResume;
    let scoring: Scoring;

    if (duplicate?.parsed_json?.scoring) {
      parsed = duplicate.parsed_json;
      scoring = duplicate.parsed_json.scoring;
    } else {
      const pdfBase64 = await step.run("download-pdf", async () => {
        const res = await fetch(resume.raw_file_url);
        if (!res.ok) {
          throw new Error(`download-pdf: ${res.status} ${res.statusText}`);
        }
        const ab = await res.arrayBuffer();
        return Buffer.from(ab).toString("base64");
      });

      parsed = await step.run("parse-claude", async () => {
        return parseResume(Buffer.from(pdfBase64, "base64"));
      });

      scoring = await step.run("score-claude", async () => {
        return scoreResume(parsed);
      });
    }

    await step.run("write-result", async () => {
      const { error } = await supabase
        .from("resumes")
        .update({
          parsed_text: parsed.raw_text,
          parsed_json: { ...parsed, scoring },
          resume_score: scoring.overall,
          seniority_level: parsed.seniority_level,
          total_years_exp: parsed.total_years_exp,
          status: "complete",
          parsed_at: new Date().toISOString(),
          is_current: true,
          parser_model: PARSER_MODEL,
          scorer_model: SCORER_MODEL,
          prompt_version: PROMPT_VERSION,
          parse_error: null,
        })
        .eq("id", resumeId);
      if (error) throw new Error(`write-result: ${error.message}`);
    });

    await step.run("notify-feed", async () => {
      await createNotification(
        {
          profileId: resume.profile_id,
          type: "resume_complete",
          title: "Resume parsed",
          body: "Your resume score is ready.",
          href: "/dashboard#resume-hub",
          metadata: { resumeId, resumeScore: scoring.overall },
        },
        supabase
      );
    });

    await step.sendEvent(
      "notify-downstream",
      CandidateResumeParsedEvent.create({
        resumeId,
        profileId: resume.profile_id,
        resumeScore: scoring.overall,
      })
    );

    return { resumeId, resumeScore: scoring.overall, deduped: !!duplicate };
  }
);
