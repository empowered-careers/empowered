import { z } from "zod";

import { type BigWinsAnswers, CATEGORIES } from "@/lib/assessment/big-wins";

import { getAnthropic, SCORER_MODEL } from "./anthropic";
import { BIG_WINS_SYSTEM_PROMPT } from "./prompts";

const PolishedWinsSchema = z.object({
  bullets: z.array(z.string().min(1)).max(8),
});

export interface PolishWinsInput {
  company: string;
  title: string;
  start: string | null;
  end: string | null;
  /** Bullets the parser lifted from the resume — context only, not a source of numbers. */
  originalBullets: string[];
  /** The candidate's answers for this role, keyed by category. */
  answers: NonNullable<BigWinsAnswers[string]>;
}

/**
 * Rewrite one role's bullets from the candidate's Q&A answers.
 *
 * One call per role, made while the candidate waits on the recap screen — see
 * decision 6 in docs/big-wins-implementation-plan.md. The system prompt is
 * cache_control: ephemeral so the roles in a single sitting share the cache.
 *
 * ponytail: reuses SCORER_MODEL (Sonnet) rather than adding a third model env
 * var. Give Big Wins its own if the writing quality needs tuning separately.
 */
export async function polishWins(input: PolishWinsInput): Promise<string[]> {
  const qa = Object.entries(input.answers)
    .filter(([, answer]) => answer && answer.trim().length > 0)
    .map(([key, answer]) => {
      const category = CATEGORIES[key as keyof typeof CATEGORIES];
      return `Q (${category?.label ?? key}): ${category?.ask ?? key}\nA: ${answer!.trim()}`;
    });

  // Nothing to work with — don't spend a call to be told so.
  if (qa.length === 0) return [];

  const dates = [input.start ?? "?", input.end ?? "present"].join(" — ");
  const original = input.originalBullets.length
    ? `\n\nBullets currently on their resume for this role (context for tone and detail — do NOT take numbers from here unless the candidate repeated them above):\n${input.originalBullets.map((b) => `- ${b}`).join("\n")}`
    : "";

  const client = getAnthropic();
  const response = await client.messages.create({
    model: SCORER_MODEL,
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: BIG_WINS_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Role: ${input.title} at ${input.company} (${dates})

The candidate's answers:

${qa.join("\n\n")}${original}

Write the bullets for this role. Return only the JSON.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Big Wins: no text block in Claude response");
  }

  return PolishedWinsSchema.parse(extractJson(textBlock.text)).bullets;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Big Wins: no JSON object in response");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}
