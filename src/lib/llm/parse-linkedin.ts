import { getAnthropic, PARSER_MODEL, responseJson } from "./anthropic";
import { LINKEDIN_PARSER_SYSTEM_PROMPT } from "./prompts";
import { type ParsedLinkedIn, ParsedLinkedInSchema } from "./schemas";

/**
 * Send a LinkedIn "Save to PDF" export to Claude (Haiku) and return strict-
 * validated ParsedLinkedIn. The system prompt is cache_control: ephemeral
 * so repeated parses within a 5-minute window hit the prompt cache.
 */
export async function parseLinkedIn(
  pdfBuffer: Buffer
): Promise<ParsedLinkedIn> {
  const base64 = pdfBuffer.toString("base64");
  const client = getAnthropic();

  const response = await client.messages.create({
    model: PARSER_MODEL,
    // See parse-resume.ts — same ceiling. This parser emits `about` prose and
    // every experience bullet verbatim, so it is if anything more exposed.
    max_tokens: 16384,
    system: [
      {
        type: "text",
        text: LINKEDIN_PARSER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: "Extract this LinkedIn profile into the JSON schema described in the system prompt. Return only the JSON.",
          },
        ],
      },
    ],
  });

  return ParsedLinkedInSchema.parse(responseJson(response, "LinkedIn parser"));
}
