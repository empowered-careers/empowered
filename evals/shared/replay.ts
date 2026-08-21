import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Recorded model responses, so a scorer suite can run offline and
 * deterministically.
 *
 * Why: the documented gate is "run the evals before bumping
 * RESUME_PROMPT_VERSION". A gate that costs an API key and real tokens on every
 * prompt edit doesn't get run. Replay makes the default run free, which is the
 * only version of this that survives contact with a busy week.
 *
 * Three modes:
 *   replay (default) — read `evals/<suite>/recorded/<id>.json`, no API calls
 *   record           — call the model, write the response, then grade it
 *   live             — call the model, write nothing
 *
 * Replay proves the *graders* still agree with the recorded responses — the
 * rubric checks, the pairwise ordering, the tolerance band. It cannot notice
 * that the model's behaviour drifted; only `--live` does that. Record after a
 * deliberate prompt change, and read a live run before shipping one.
 */
export type Mode = "replay" | "record" | "live";

export function modeFromArgv(argv: string[] = process.argv.slice(2)): Mode {
  if (argv.includes("--record")) return "record";
  if (argv.includes("--live")) return "live";
  return "replay";
}

/**
 * Return the recorded response for `id`, or produce one via `compute` and
 * record it — depending on `mode`.
 */
export async function through<T>(
  mode: Mode,
  suite: string,
  id: string,
  compute: () => Promise<T>
): Promise<T> {
  const file = join(process.cwd(), "evals", suite, "recorded", `${id}.json`);

  if (mode === "replay") {
    if (!existsSync(file)) {
      throw new Error(
        `No recording for ${suite}/${id}. Run \`npm run eval:${suite} -- --record\` (needs ANTHROPIC_API_KEY).`
      );
    }
    return JSON.parse(readFileSync(file, "utf-8")) as T;
  }

  const value = await compute();
  if (mode === "record") {
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
  }
  return value;
}
