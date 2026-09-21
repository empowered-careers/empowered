import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { NonRetriableError } from "inngest";

import { env } from "../../../env";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required for resume parsing/scoring");
  }
  if (!_client) {
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export const PARSER_MODEL = env.ANTHROPIC_PARSER_MODEL;
export const SCORER_MODEL = env.ANTHROPIC_SCORER_MODEL;
export const PROMPT_VERSION = env.RESUME_PROMPT_VERSION;
export const LINKEDIN_PROMPT_VERSION = env.LINKEDIN_PROMPT_VERSION;

/**
 * Pull the first balanced JSON object out of a model text block.
 * `label` prefixes the error so a failure names the call that produced it.
 */
export function extractJson(text: string, label: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`${label}: no JSON object in response`);
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

/**
 * Take a Messages response apart into validated JSON. Every LLM call in this
 * directory routes through here so the truncation check can't be forgotten at
 * a call site.
 *
 * A response cut off at `max_tokens` leaves unbalanced JSON, which `extractJson`
 * would report as a syntax error at some character offset — that cost real
 * debugging time once (7 resumes silently failed on a 4096 cap). Name it here
 * instead so the budget is the obvious suspect next time.
 *
 * Truncation is thrown as NonRetriableError: the same document against the same
 * budget truncates identically every time. Retrying it just burns the attempt
 * budget — in the beta each of these cost 3 full parse calls over ~250s before
 * the row finally landed in `failed`.
 */
export function responseJson(response: Message, label: string): unknown {
  if (response.stop_reason === "max_tokens") {
    throw new NonRetriableError(
      `${label}: response truncated at max_tokens (${response.usage.output_tokens} tokens) — raise max_tokens for this call`
    );
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`${label}: no text block in Claude response`);
  }

  return extractJson(textBlock.text, label);
}
