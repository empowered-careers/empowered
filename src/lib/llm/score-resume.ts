import { extractJson, getAnthropic, SCORER_MODEL } from "./anthropic";
import { SCORER_SYSTEM_PROMPT } from "./prompts";
import { type ParsedResume, type Scoring, ScoringSchema } from "./schemas";

/**
 * Send parsed resume JSON to Claude (Sonnet) and return strict-validated Scoring.
 * The rubric system prompt is cache_control: ephemeral.
 */
export async function scoreResume(parsed: ParsedResume): Promise<Scoring> {
  const client = getAnthropic();

  // Strip raw_text before sending — it's already factored into parsed structure
  // and would inflate token count. The scorer reads the structured fields.
  const payload = { ...parsed } as Partial<ParsedResume>;
  delete payload.raw_text;

  const response = await client.messages.create({
    model: SCORER_MODEL,
    max_tokens: 1024,
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
              JSON.stringify(payload, null, 2) +
              "\n</parsed_resume>",
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Scorer: no text block in Claude response");
  }

  const json = extractJson(textBlock.text, "Scorer");
  return ScoringSchema.parse(json);
}
