/**
 * One-off backfill: re-parse and re-score the beta cohort's resumes and
 * LinkedIn profiles.
 *
 * Why: two bugs produced wrong stored results for every early tester.
 *  - Resume parses failed outright when the model's JSON was truncated at the
 *    old 4096 max_tokens ceiling (7 of 16 uploads).
 *  - LinkedIn scoring penalised everyone for a headline, skills and
 *    recommendations that the "Save to PDF" export never contained.
 *
 * RUN THIS ONLY AFTER THE FIXES ARE DEPLOYED. `inngest.send` enqueues work that
 * Inngest Cloud dispatches to the *deployed* serve endpoint, so running it
 * against the old build just reproduces the same failures and burns tokens.
 *
 *   npx tsx --env-file-if-exists=.env.local scripts/backfill-rescore.ts        # dry run
 *   npx tsx --env-file-if-exists=.env.local scripts/backfill-rescore.ts --go   # send
 */
import {
  inngest,
  LinkedinUploadedEvent,
  ResumeUploadedEvent,
} from "../src/inngest/client";
import { createServiceClient } from "../src/lib/supabase/service";

const GO = process.argv.includes("--go");

async function main() {
  const supabase = createServiceClient();

  // Resumes that never produced a score. Completed rows are left alone: their
  // stored scores are valid, and re-running them would churn for nothing.
  const { data: resumes, error: resumeError } = await supabase
    .from("resumes")
    .select("id, profile_id, file_name, parse_error")
    .neq("status", "complete");
  if (resumeError) throw new Error(`resumes: ${resumeError.message}`);

  // Every LinkedIn profile is affected — the rubric changed for all of them.
  // `last_export_path` is required; without it there is no PDF to re-read.
  const { data: linkedins, error: linkedinError } = await supabase
    .from("linkedin_profiles")
    .select("id, profile_id, last_export_path")
    .not("last_export_path", "is", null);
  if (linkedinError)
    throw new Error(`linkedin_profiles: ${linkedinError.message}`);

  console.log(
    `${GO ? "Sending" : "DRY RUN — would send"}: ` +
      `${resumes?.length ?? 0} resume, ${linkedins?.length ?? 0} LinkedIn events\n`
  );

  for (const r of resumes ?? []) {
    console.log(
      `  resume  ${r.id}  ${r.file_name ?? "(unnamed)"}  ${r.parse_error ?? ""}`
    );
    if (GO) {
      await inngest.send(
        ResumeUploadedEvent.create({ resumeId: r.id, profileId: r.profile_id })
      );
    }
  }

  for (const l of linkedins ?? []) {
    console.log(`  linkedin ${l.id}`);
    if (GO) {
      await inngest.send(
        LinkedinUploadedEvent.create({
          linkedinProfileId: l.id,
          profileId: l.profile_id,
          storageObjectPath: l.last_export_path as string,
        })
      );
    }
  }

  console.log(
    GO
      ? "\nQueued. Watch the Inngest dashboard, then re-check:\n" +
          "  select status, count(*) from resumes group by status;\n" +
          "  select count(headline) from linkedin_profiles;"
      : "\nNothing sent. Re-run with --go once the fixes are deployed."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
