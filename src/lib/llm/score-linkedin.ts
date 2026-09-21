import { getAnthropic, responseJson, SCORER_MODEL } from "./anthropic";
import { LINKEDIN_SCORER_SYSTEM_PROMPT } from "./prompts";
import {
  type LinkedInScoring,
  LinkedInScoringSchema,
  type ParsedLinkedIn,
} from "./schemas";

/**
 * Send parsed LinkedIn JSON to Claude (Sonnet) and return strict-validated
 * scoring. `headline` is resolved by the caller (PDF first, OAuth as fallback)
 * and passed separately because it is the short bio recruiters see in search
 * results rather than a section of the profile body.
 *
 * When no headline could be read from either source the block is omitted
 * entirely rather than sent as "(empty)" — the scorer must not be told a field
 * is blank when we simply failed to read it.
 */
export async function scoreLinkedIn(
  parsed: ParsedLinkedIn,
  headline: string | null
): Promise<LinkedInScoring> {
  const client = getAnthropic();

  const headlineSection = headline
    ? `<headline>\n${headline}\n</headline>\n\n`
    : "<headline_unavailable>The headline could not be read from this profile. Do not score headline_quality and do not claim the candidate's headline is empty or missing.</headline_unavailable>\n\n";

  const response = await client.messages.create({
    model: SCORER_MODEL,
    max_tokens: 4096,
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
              headlineSection +
              "<parsed_profile>\n" +
              JSON.stringify(parsed, null, 2) +
              "\n</parsed_profile>",
          },
        ],
      },
    ],
  });

  return LinkedInScoringSchema.parse(responseJson(response, "LinkedIn scorer"));
}
