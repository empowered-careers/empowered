import Anthropic from "@anthropic-ai/sdk";

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
