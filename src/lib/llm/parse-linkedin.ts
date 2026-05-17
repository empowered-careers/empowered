import { getAnthropic, PARSER_MODEL } from "./anthropic";
import { LINKEDIN_PARSER_SYSTEM_PROMPT } from "./prompts";
import { type ParsedLinkedIn, ParsedLinkedInSchema } from "./schemas";

/**
 * Send a LinkedIn "Save to PDF" export to Claude (Haiku) and return strict-
 * validated ParsedLinkedIn. The system prompt is cache_control: ephemeral
 * so repeated parses within a 5-minute window hit the prompt cache.
 */
export async function parseLinkedIn(pdfBuffer: Buffer): Promise<ParsedLinkedIn> {
  const base64 = pdfBuffer.toString("base64");
  const client = getAnthropic();

  const response = await client.messages.create({
    model: PARSER_MODEL,
    max_tokens: 4096,
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

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("LinkedIn parser: no text block in Claude response");
  }
  return ParsedLinkedInSchema.parse(extractJson(textBlock.text));
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("LinkedIn parser: no JSON object in response");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}
