import { getAnthropic, responseJson, SCORER_MODEL } from "./anthropic";
import { SCORER_SYSTEM_PROMPT } from "./prompts";
import { type ParsedResume, type Scoring, ScoringSchema } from "./schemas";

/**
 * Send parsed resume JSON to Claude (Sonnet) and return strict-validated Scoring.
 * The rubric system prompt is cache_control: ephemeral.
 */
export async function scoreResume(parsed: ParsedResume): Promise<Scoring> {
  const client = getAnthropic();

  const response = await client.messages.create({
    model: SCORER_MODEL,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: SCORER_SYSTEM_PROMPT,
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
              "Score this parsed resume per the rubric in the system prompt. Return only the JSON object.\n\n" +
              "<parsed_resume>\n" +
              JSON.stringify(parsed, null, 2) +
              "\n</parsed_resume>",
          },
        ],
      },
    ],
  });

  return ScoringSchema.parse(responseJson(response, "Scorer"));
}
