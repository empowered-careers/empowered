import { NonRetriableError } from "inngest";

import { matchJd } from "@/lib/llm/match-jd";
import type { ParsedResume } from "@/lib/llm/schemas";
import { createNotification } from "@/lib/notifications/create";
import { createServiceClient } from "@/lib/supabase/service";

import { CandidateJdScoredEvent, inngest, JdSubmittedEvent } from "../client";

/**
 * JD → ATS check. Reads the candidate's current resume, scores it against the
 * pasted posting, writes `ats_score` + `gap_summary` + the parsed requirements.
 *
 * Mirrors parse-resume / parse-linkedin: service client, one step per stage,
 * terminal failure written to the row by `onFailure` so the UI stops spinning.
 */
export const matchJdFn = inngest.createFunction(
  {
    id: "match-jd",
    retries: 2,
    concurrency: { limit: 5 },
    triggers: [JdSubmittedEvent],
    onFailure: async ({ event, error }) => {
      const inner = (event.data as { event?: { data?: { jdId?: string } } })
        .event;
      const id = inner?.data?.jdId;
      if (!id) return;
      const supabase = createServiceClient();
      await supabase
        .from("jds")
        .update({
          status: "failed",
          parse_error: error.message.slice(0, 1000),
        })
        .eq("id", id);
    },
  },
  async ({ event, step }) => {
    const { jdId } = event.data as { jdId: string; profileId: string };
    const supabase = createServiceClient();

    const row = await step.run("fetch-row", async () => {
      const { data, error } = await supabase
        .from("jds")
        .select("id, profile_id, raw_text")
        .eq("id", jdId)
        .maybeSingle();
      if (error) throw new Error(`fetch-row: ${error.message}`);
      if (!data) throw new NonRetriableError(`jds row ${jdId} not found`);
      if (!data.raw_text?.trim()) {
        throw new NonRetriableError(`jds row ${jdId} has no text to score`);
      }
      return data;
    });

    const resume = await step.run("fetch-resume", async () => {
      const { data } = await supabase
        .from("resumes")
        .select("parsed_json")
        .eq("profile_id", row.profile_id)
        .eq("is_current", true)
        .eq("status", "complete")
        .maybeSingle();
      return (data?.parsed_json as ParsedResume | null) ?? null;
    });

    const match = await step.run("match-claude", async () => {
      return matchJd({ jdText: row.raw_text as string, resume });
    });

    await step.run("write-result", async () => {
      const { error } = await supabase
        .from("jds")
        .update({
          parsed_json: match,
          ats_score: match.ats_score,
          gap_summary: match.gap_summary,
          status: "complete",
          parse_error: null,
        })
        .eq("id", jdId);
      if (error) throw new Error(`write-result: ${error.message}`);
    });

    await step.run("notify-feed", async () => {
      await createNotification(
        {
          profileId: row.profile_id,
          type: "jd_scored",
          title: "JD match ready",
          body: match.requirements.title
            ? `${match.requirements.title} — ${match.ats_score}/100.`
            : `Your match scored ${match.ats_score}/100.`,
          href: `/jd-match/${jdId}`,
          metadata: { jdId, atsScore: match.ats_score },
        },
        supabase
      );
    });

    await step.sendEvent(
      "notify-downstream",
      CandidateJdScoredEvent.create({
        jdId,
        profileId: row.profile_id,
        atsScore: match.ats_score,
      })
    );

    return { jdId, atsScore: match.ats_score };
  }
);
