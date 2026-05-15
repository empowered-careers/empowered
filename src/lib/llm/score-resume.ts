import { getAnthropic, SCORER_MODEL } from "./anthropic";
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
  const { raw_text: _ignored, ...payload } = parsed;

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
              JSON.stringify(payload, null, 2),
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Scorer: no text block in Claude response");
  }

  const json = extractJson(textBlock.text);
  return ScoringSchema.parse(json);
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Scorer: no JSON object in response");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}
