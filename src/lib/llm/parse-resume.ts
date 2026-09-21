import { getAnthropic, PARSER_MODEL, responseJson } from "./anthropic";
import { PARSER_SYSTEM_PROMPT } from "./prompts";
import { type ParsedResume, ParsedResumeSchema } from "./schemas";

/**
 * Send a PDF buffer to Claude (Haiku) and return strict-validated ParsedResume.
 * The system prompt is marked cache_control: ephemeral so repeated calls within
 * a 5-minute window hit the prompt cache.
 */
export async function parseResume(pdfBuffer: Buffer): Promise<ParsedResume> {
  const base64 = pdfBuffer.toString("base64");
  const client = getAnthropic();

  const response = await client.messages.create({
    model: PARSER_MODEL,
    // Generous ceiling, not a target: billing is per token generated, so
    // headroom is free. The old 4096 cut through the middle of a normal resume
    // (a 7-role CV used 86% of it) and silently failed 7 of 16 real uploads.
    max_tokens: 16384,
    system: [
      {
        type: "text",
        text: PARSER_SYSTEM_PROMPT,
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
            text: "Extract the resume into the JSON schema described in the system prompt. Return only the JSON.",
          },
        ],
      },
    ],
  });

  return ParsedResumeSchema.parse(responseJson(response, "Parser"));
}
