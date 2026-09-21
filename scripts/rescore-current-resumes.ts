/**
 * One-off: re-score each candidate's *current* resume under the updated rubric.
 *
 * The main backfill (scripts/backfill-rescore.ts) only re-fires rows that never
 * completed. Rows scored before the role_progression change still hold their old
 * breakdown, and re-firing them through Inngest doesn't help: the `check-dedup`
 * step in parse-resume.ts copies a sibling complete row's stored scoring when the
 * file hash matches, so a duplicate upload would just carry the old score forward.
 *
 * So this runs parse + score directly and writes the result. On any error the row
 * is left exactly as it was — a good score can never be turned into a failure.
 *
 *   npx tsx --env-file-if-exists=.env.local scripts/rescore-current-resumes.ts        # dry run
 *   npx tsx --env-file-if-exists=.env.local scripts/rescore-current-resumes.ts --go
 */
import {
  PARSER_MODEL,
  PROMPT_VERSION,
  SCORER_MODEL,
} from "../src/lib/llm/anthropic";
import { parseResume } from "../src/lib/llm/parse-resume";
import { scoreResume } from "../src/lib/llm/score-resume";
import { createServiceClient } from "../src/lib/supabase/service";

const GO = process.argv.includes("--go");

async function main() {
  const supabase = createServiceClient();

  const { data: rows, error } = await supabase
    .from("resumes")
    .select(
      "id, profile_id, file_name, raw_file_url, resume_score, prompt_version"
    )
    .eq("is_current", true)
    .eq("status", "complete");
  if (error) throw new Error(error.message);

  const stale = (rows ?? []).filter((r) => r.prompt_version !== PROMPT_VERSION);
  console.log(
    `${stale.length} current resume(s) on an older rubric${GO ? "" : " (dry run)"}\n`
  );

  for (const r of stale) {
    try {
      const res = await fetch(r.raw_file_url);
      if (!res.ok) throw new Error(`download ${res.status}`);
      const parsed = await parseResume(Buffer.from(await res.arrayBuffer()));
      const scoring = await scoreResume(parsed);

      console.log(
        `  ${r.file_name}: ${r.resume_score} -> ${scoring.overall}  (role_progression ${scoring.dimensions.role_progression})`
      );

      if (!GO) continue;

      const { error: upErr } = await supabase
        .from("resumes")
        .update({
          parsed_json: { ...parsed, scoring },
          resume_score: scoring.overall,
          seniority_level: parsed.seniority_level,
          total_years_exp: parsed.total_years_exp,
          parsed_at: new Date().toISOString(),
          parser_model: PARSER_MODEL,
          scorer_model: SCORER_MODEL,
          prompt_version: PROMPT_VERSION,
          parse_error: null,
        })
        .eq("id", r.id);
      if (upErr) throw new Error(`write: ${upErr.message}`);
    } catch (err) {
      // Leave the row untouched. A stale score beats a broken one.
      console.log(`  ${r.file_name}: SKIPPED — ${(err as Error).message}`);
    }
  }

  console.log(GO ? "\nDone." : "\nNothing written. Re-run with --go.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
