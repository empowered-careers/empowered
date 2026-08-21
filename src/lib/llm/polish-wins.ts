import { z } from "zod";

import {
  type BigWinsAnswers,
  CATEGORIES,
  unbackedNumbers,
} from "@/lib/assessment/big-wins";

import { extractJson, getAnthropic, SCORER_MODEL } from "./anthropic";
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

export interface PolishedWins {
  bullets: string[];
  /**
   * Bullet index → the figures in it that don't trace back to the candidate's
   * answers. Surfaced on the recap screen for them to confirm or edit; never a
   * reason to drop the bullet.
   */
  flagged: Record<number, string[]>;
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
export async function polishWins(
  input: PolishWinsInput
): Promise<PolishedWins> {
  const qa = Object.entries(input.answers)
    .filter(([, answer]) => answer && answer.trim().length > 0)
    .map(([key, answer]) => {
      const category = CATEGORIES[key as keyof typeof CATEGORIES];
      return `Q (${category?.label ?? key}): ${category?.ask ?? key}\nA: ${answer!.trim()}`;
    });

  // Nothing to work with — don't spend a call to be told so.
  if (qa.length === 0) return { bullets: [], flagged: {} };

  const dates = [input.start ?? "?", input.end ?? "present"].join(" — ");
  const original = input.originalBullets.length
    ? `\n\nBullets currently on their resume for this role (context for tone and detail — do NOT take numbers from here unless the candidate repeated them above):\n<resume_bullets>\n${input.originalBullets.map((b) => `- ${b}`).join("\n")}\n</resume_bullets>`
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

<candidate_answers>
${qa.join("\n\n")}
</candidate_answers>${original}

Write the bullets for this role. Return only the JSON.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Big Wins: no text block in Claude response");
  }

  const { bullets } = PolishedWinsSchema.parse(
    extractJson(textBlock.text, "Big Wins")
  );

  // The prompt's one unbreakable rule, checked rather than trusted. Original
  // resume bullets count as a source: the prompt allows reusing a figure the
  // candidate repeated in their answers.
  const sources = [...Object.values(input.answers), ...input.originalBullets]
    .filter((t): t is string => Boolean(t && t.trim()))
    .map((t) => t.trim());

  const flagged: Record<number, string[]> = {};
  bullets.forEach((bullet, i) => {
    const unbacked = unbackedNumbers(bullet, sources);
    if (unbacked.length > 0) flagged[i] = unbacked;
  });

  return { bullets, flagged };
}
