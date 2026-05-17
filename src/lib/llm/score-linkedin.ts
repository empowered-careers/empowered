import { getAnthropic, SCORER_MODEL } from "./anthropic";
import { LINKEDIN_SCORER_SYSTEM_PROMPT } from "./prompts";
import {
  type LinkedInScoring,
  LinkedInScoringSchema,
  type ParsedLinkedIn,
} from "./schemas";

/**
 * Send parsed LinkedIn JSON + the OAuth-derived headline to Claude (Sonnet)
 * and return strict-validated scoring. The headline is passed separately
 * because it's the canonical short bio in recruiter search results — the
 * version that may appear inside the PDF is irrelevant.
 */
export async function scoreLinkedIn(
  parsed: ParsedLinkedIn,
  oauthHeadline: string | null
): Promise<LinkedInScoring> {
  const client = getAnthropic();

  const response = await client.messages.create({
    model: SCORER_MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: LINKEDIN_SCORER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Score this LinkedIn profile per the rubric. Return only the JSON object.\n\n" +
              "## OAuth Headline (canonical, used by recruiters)\n" +
              (oauthHeadline ? `"${oauthHeadline}"` : "(empty)") +
              "\n\n## Parsed profile\n" +
              JSON.stringify(parsed, null, 2),
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("LinkedIn scorer: no text block in Claude response");
  }
  return LinkedInScoringSchema.parse(extractJson(textBlock.text));
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("LinkedIn scorer: no JSON object in response");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}
