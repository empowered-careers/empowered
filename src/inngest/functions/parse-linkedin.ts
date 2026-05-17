import { NonRetriableError } from "inngest";

import {
  LINKEDIN_PROMPT_VERSION,
  PARSER_MODEL,
  SCORER_MODEL,
} from "@/lib/llm/anthropic";
import { parseLinkedIn } from "@/lib/llm/parse-linkedin";
import { scoreLinkedIn } from "@/lib/llm/score-linkedin";
import { createServiceClient } from "@/lib/supabase/service";

import {
  CandidateLinkedinParsedEvent,
  inngest,
  LinkedinUploadedEvent,
} from "../client";

export const parseLinkedinFn = inngest.createFunction(
  {
    id: "parse-linkedin",
    retries: 2,
    concurrency: { limit: 10 },
    triggers: [LinkedinUploadedEvent],
    onFailure: async ({ event, error }) => {
      const inner = (
        event.data as { event?: { data?: { linkedinProfileId?: string } } }
      ).event;
      const id = inner?.data?.linkedinProfileId;
      if (!id) return;
      const supabase = createServiceClient();
      await supabase
        .from("linkedin_profiles")
        .update({
          status: "failed",
          sync_error: error.message.slice(0, 1000),
        })
        .eq("id", id);
    },
  },
  async ({ event, step }) => {
    const { linkedinProfileId, storageObjectPath } = event.data as {
      linkedinProfileId: string;
      profileId: string;
      storageObjectPath: string;
    };
    const supabase = createServiceClient();

    const row = await step.run("fetch-row", async () => {
      const { data, error } = await supabase
        .from("linkedin_profiles")
        .select("id, profile_id, linkedin_url, headline, file_hash")
        .eq("id", linkedinProfileId)
        .maybeSingle();
      if (error) throw new Error(`fetch-row: ${error.message}`);
      if (!data)
        throw new NonRetriableError(
          `linkedin_profiles row ${linkedinProfileId} not found`
        );
      return data;
    });

    const pdfBase64 = await step.run("download-pdf", async () => {
      const { data, error } = await supabase.storage
        .from("linkedin-exports")
        .download(storageObjectPath);
      if (error || !data) {
        throw new Error(
          `download-pdf: ${error?.message ?? "no data returned"}`
        );
      }
      const ab = await data.arrayBuffer();
      return Buffer.from(ab).toString("base64");
    });

    const parsed = await step.run("parse-claude", async () => {
      return parseLinkedIn(Buffer.from(pdfBase64, "base64"));
    });

    const scoring = await step.run("score-claude", async () => {
      return scoreLinkedIn(parsed, row.headline);
    });

    await step.run("write-result", async () => {
      // Update only PDF-derived fields. linkedin_url, headline, raw_json
      // (OAuth blob) are NEVER touched — those are the OAuth contract.
      const { error } = await supabase
        .from("linkedin_profiles")
        .update({
          parsed_json: { ...parsed, scoring },
          summary: parsed.about,
          profile_score: scoring.overall,
          status: "complete",
          synced_at: new Date().toISOString(),
          sync_error: null,
          parser_model: PARSER_MODEL,
          scorer_model: SCORER_MODEL,
          prompt_version: LINKEDIN_PROMPT_VERSION,
        })
        .eq("id", linkedinProfileId);
      if (error) throw new Error(`write-result: ${error.message}`);
    });

    await step.sendEvent(
      "notify-downstream",
      CandidateLinkedinParsedEvent.create({
        linkedinProfileId,
        profileId: row.profile_id,
        profileScore: scoring.overall,
      })
    );

    return { linkedinProfileId, profileScore: scoring.overall };
  }
);
