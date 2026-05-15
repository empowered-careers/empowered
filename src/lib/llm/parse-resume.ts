import { getAnthropic, PARSER_MODEL } from "./anthropic";
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
    max_tokens: 4096,
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

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Parser: no text block in Claude response");
  }

  const json = extractJson(textBlock.text);
  return ParsedResumeSchema.parse(json);
}

function extractJson(text: string): unknown {
  // Strip markdown fences and find the first balanced JSON object.
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Parser: no JSON object in response");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}
