import { NonRetriableError } from "inngest";

import {
  LINKEDIN_PROMPT_VERSION,
  PARSER_MODEL,
  SCORER_MODEL,
} from "@/lib/llm/anthropic";
import { parseLinkedIn } from "@/lib/llm/parse-linkedin";
import { scoreLinkedIn } from "@/lib/llm/score-linkedin";
import { createNotification } from "@/lib/notifications/create";
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
    concurrency: { limit: 5 },
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

    // The PDF is the reliable source: the OAuth headline needs scopes we don't
    // hold, so /v2/me returns null for every candidate in practice. Prefer what
    // we actually read, fall back to OAuth if the export had no headline line.
    const headline = parsed.headline ?? row.headline;

    const scoring = await step.run("score-claude", async () => {
      return scoreLinkedIn(parsed, headline);
    });

    await step.run("write-result", async () => {
      // linkedin_url and raw_json (OAuth blob) are NEVER touched — those are
      // the OAuth contract. headline is written back because the PDF is the
      // only source that reliably has one.
      const { error } = await supabase
        .from("linkedin_profiles")
        .update({
          parsed_json: { ...parsed, scoring },
          headline,
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

    await step.run("notify-feed", async () => {
      await createNotification(
        {
          profileId: row.profile_id,
          type: "linkedin_sync",
          title: "LinkedIn synced",
          body: "Your LinkedIn score is ready.",
          href: "/dashboard",
          metadata: { linkedinProfileId, profileScore: scoring.overall },
        },
        supabase
      );
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
