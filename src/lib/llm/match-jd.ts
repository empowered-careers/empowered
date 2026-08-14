import { getAnthropic, SCORER_MODEL } from "./anthropic";
import { JD_MATCH_SYSTEM_PROMPT } from "./prompts";
import { type JdMatch, JdMatchSchema, type ParsedResume } from "./schemas";

/**
 * Parse a pasted job description and score the candidate's current resume against
 * it, in one Claude call. Splitting parse from score would double the round trips
 * for what is a single judgement — and unlike the resume parser, nothing reuses
 * the JD parse independently.
 *
 * Uses SCORER_MODEL (Sonnet): this is a ranking-and-explanation problem, and the
 * gap summary is shown to the candidate verbatim.
 */
export interface MatchJdInput {
  jdText: string;
  resume: ParsedResume | null;
  /** Blueprint dimensions, when the candidate has taken it. Context, not scoring input. */
  blueprintSummary?: string | null;
}

export async function matchJd(input: MatchJdInput): Promise<JdMatch> {
  const client = getAnthropic();

  // Strip raw_text as the resume scorer does — the structured fields carry the
  // signal and raw_text just inflates the token count.
  const resume = input.resume ? { ...input.resume } : null;
  if (resume) delete (resume as Partial<ParsedResume>).raw_text;

  const sections = [
    "## Job description\n\n",
    input.jdText.trim(),
    "\n\n## Candidate's parsed resume\n\n",
    resume ? JSON.stringify(resume, null, 2) : "(no parsed resume on file)",
  ];
  if (input.blueprintSummary) {
    sections.push(
      "\n\n## Candidate's Career Identity Blueprint\n\n",
      input.blueprintSummary,
      "\n\nContext only — do not let it move the score. Evidence comes from the resume."
    );
  }

  const response = await client.messages.create({
    model: SCORER_MODEL,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: JD_MATCH_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `${sections.join("")}\n\nReturn only the JSON object.`,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("JD match: no text block in Claude response");
  }

  return JdMatchSchema.parse(extractJson(textBlock.text));
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("JD match: no JSON object in response");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}
