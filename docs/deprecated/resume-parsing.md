# Resume Parsing + ATS Scoring via Claude — Plan

## Context

Resume parsing and ATS scoring are stubbed in the codebase:
- `src/lib/pdf-extract.ts` returns placeholder text (TODO: wire `unpdf`).
- `src/app/api/parse-resume/route.ts` uses `calculateAtsScoreStub()` — keyword counts, 40–100 range.

The async-job scaffolding around them is **complete**: `resumes.status` enum (`uploading | processing | complete | failed`), `parse_started_at`, `parse_error`, fire-and-forget POST from `insertResumeRow()`, Realtime hook in root layout, Sonner toast on completion.

This plan replaces the stubs with a Claude-powered pipeline that produces:
1. Structured `parsed_json` (skills, work_experience, education, dates).
2. A defensible `ats_score` (0–100) with per-dimension breakdown stored alongside.

Driving motivations: (a) PDF text extraction libraries fail on the multi-column / designer / scanned resumes senior tech candidates submit; (b) keyword-count ATS scoring is not defensible to a candidate paying for a resume review; (c) the rubric is product IP and must be versioned and evalable.

---

## Architecture decision summary

| Decision | Choice | Reason |
|---|---|---|
| Runner | **Inngest background function, not a Vercel route** | No serverless timeout (Claude calls can take 10s+ end-to-end), built-in retries with exponential backoff, full run observability in the Inngest GUI, free tier (50k executions/month) covers Phase 1 + 2 with headroom. |
| File handling | **PDF only for Phase 1; DOCX deferred** | Anthropic docs confirm DOCX is not natively supported and needs conversion. Conversion infra (`docx2pdf` / libreoffice / worker) is real complexity. Defer until DOCX upload volume justifies it; reject DOCX at upload with a clear "PDF only" message for now. |
| Call shape | **Two sequential calls: parser (Haiku 4.5) → scorer (Sonnet 4.6)** | Different eval methodology per stage; cheaper than single Sonnet; rubric iteration without re-parsing; parser reusable for LinkedIn export job. |
| Style | **Plain Messages API, structured output via JSON schema, prompt caching on rubric** | Not agentic. Bounded transform, no tool use, no multi-step decisions. |
| Dedup | **`file_hash` (sha256) column; short-circuit before calling Claude if a prior resume on same `profile_id` has matching hash** | Candidates re-upload the same PDF often. Saves redundant API spend. One-liner on upload. |
| Active-resume tracking | **`is_current boolean` + `superseded_at timestamptz` on `resumes`** | Admin pool view and matching engine need "current resume" without scanning all rows per candidate. Setting a new resume to `is_current=true` flips the prior current row to `false` + stamps `superseded_at`. |
| Promoted columns | **`seniority_level` + `total_years_exp` lifted out of `parsed_json` into top-level columns, written by the parser** | Lauren's candidate-pool filter and matching engine query these on every page load. JSONB queries are fine at 100 candidates, painful at 1000. Cheaper to promote now than migrate later. |
| Failure model | **Each call retries once on transient error; second failure flips `status=failed`, writes `parse_error`** | Realtime hook already surfaces failure toasts. |
| Versioning | **`parser_model`, `scorer_model`, `prompt_version` columns on `resumes`** | Attribute score-distribution shifts to model upgrades vs. prompt edits. |

---

## Implementation

### 1. Dependencies + env

```bash
npm i @anthropic-ai/sdk inngest
```

(No `mammoth` / `docx2pdf` — DOCX deferred. Tighten the storage bucket to PDF-only and update the upload UI copy.)

Add to `env.ts`:
- `ANTHROPIC_API_KEY` (server-side only, required).
- `ANTHROPIC_PARSER_MODEL` (default `claude-haiku-4-5-20251001`).
- `ANTHROPIC_SCORER_MODEL` (default `claude-sonnet-4-6`).
- `INNGEST_EVENT_KEY` (server-side, required in prod; Inngest dev server doesn't need it).
- `INNGEST_SIGNING_KEY` (server-side, required in prod).

### 2. Schema additions

New migration `supabase/migrations/<ts>_resume_llm_metadata.sql`:

```sql
ALTER TABLE resumes
  ADD COLUMN parser_model     text,
  ADD COLUMN scorer_model     text,
  ADD COLUMN prompt_version   text,        -- semver of rubric
  ADD COLUMN file_hash        text,        -- sha256 of uploaded bytes; dedup key
  ADD COLUMN is_current       boolean NOT NULL DEFAULT false,
  ADD COLUMN superseded_at    timestamptz,
  ADD COLUMN seniority_level  text,        -- promoted from parsed_json: 'ic | senior | staff | principal | director | vp | c_level'
  ADD COLUMN total_years_exp  numeric(4,1); -- promoted from parsed_json

CREATE INDEX resumes_profile_current_idx ON resumes (profile_id) WHERE is_current = true;
CREATE INDEX resumes_file_hash_idx       ON resumes (profile_id, file_hash);
CREATE INDEX resumes_seniority_idx       ON resumes (seniority_level) WHERE is_current = true;

-- Trigger: when a resume is marked is_current=true, demote prior current row
CREATE OR REPLACE FUNCTION resumes_enforce_single_current() RETURNS trigger AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE resumes
      SET is_current = false, superseded_at = now()
      WHERE profile_id = NEW.profile_id
        AND id <> NEW.id
        AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resumes_single_current_trg
  BEFORE INSERT OR UPDATE OF is_current ON resumes
  FOR EACH ROW WHEN (NEW.is_current = true)
  EXECUTE FUNCTION resumes_enforce_single_current();
```

The upload action sets `is_current=true` on the new row after a successful parse (not at insert, so a failed parse doesn't demote a working current resume). Dedup check happens **before** insert: hash bytes → query `(profile_id, file_hash)` → if hit, return the existing row and skip both Claude calls.

Then `npm run supabase:types`.

`parsed_json` shape (documented, not enforced in DB):

```ts
{
  skills: string[],
  work_experience: Array<{ company, title, start, end, bullets }>,
  education: Array<{ school, degree, field, start, end }>,
  scoring: {
    overall: number,            // == ats_score, denormalized for query
    dimensions: {
      tenure: number,           // 0-100
      role_progression: number,
      skill_density: number,
      impact_signals: number,
      formatting: number,
    },
    reasoning: string,          // single paragraph for transparency
  }
}
```

### 3. New files

| Path | Purpose |
|---|---|
| `src/lib/llm/anthropic.ts` | Singleton Anthropic client, model constants from env. |
| `src/lib/llm/parse-resume.ts` | `parseResume(pdfBuffer) → ParsedResume`. PDF → Claude document block (base64). Returns strict-JSON including `seniority_level` and `total_years_exp` at top level so the Inngest function can promote them. |
| `src/lib/file-hash.ts` | `sha256(buffer): string`. Called from the upload action before insert. |
| `src/lib/llm/score-resume.ts` | `scoreResume(parsed: ParsedResume) → Scoring`. Reads `parsed_json` only (not the raw file). |
| `src/lib/llm/prompts/parser.md` | System prompt, version-tagged at top (`v1.0.0`). Prompt-cached. |
| `src/lib/llm/prompts/scorer.md` | Rubric: 5 dimensions, weighted, with explicit anchor examples for each score band. Version-tagged. Prompt-cached. |
| `src/lib/llm/schemas.ts` | Zod schemas for `ParsedResume` and `Scoring`. Validate Claude output before DB write. |
| `src/inngest/client.ts` | `new Inngest({ id: 'empowered-careers' })` singleton + typed event map (`resume/uploaded`, `candidate/resume_parsed`). |
| `src/inngest/functions/parse-resume.ts` | The pipeline. Triggered by `resume/uploaded`. Wraps each phase in `step.run()` so Inngest retries each step independently. See shape below. |
| `src/app/api/inngest/route.ts` | Standard `serve({ client, functions: [parseResume] })` handler exporting `GET`, `POST`, `PUT`. |

### 4. Replace stubs + swap runner to Inngest

**`src/lib/pdf-extract.ts`** — delete `extractPdfText` stub. Logic moves into `src/lib/llm/parse-resume.ts`. Keep `parseLinkedInExport` for now; refactor in a separate task.

**`src/app/actions/resume.ts`** ⚠ **conflict with existing fire-and-forget, plus two required additions**.

1. **`kickoffParseResume()` (`src/app/actions/resume.ts:8-23`) currently POSTs to `/api/parse-resume`. Replace with Inngest send.**
2. **`insertResumeRow()` currently does NOT compute or store `file_hash` (`src/app/actions/resume.ts:74-82`). Must be added before the Inngest event fires, otherwise the `check-dedup` step inside the function always sees `null` and never short-circuits.**

Compute the hash **client-side** from the same buffer used for the Storage upload (avoid a second download server-side) and pass it through:

```ts
// useSupabaseUpload hook — after a successful storage.upload():
const fileHash = await sha256Hex(fileBuffer);   // crypto.subtle in the browser
await insertResumeRow({ storageObjectPath, fileName, fileHash });
```

```ts
// src/app/actions/resume.ts
export async function insertResumeRow(input: {
  storageObjectPath: string;
  fileName: string;
  fileHash: string;          // ← new, required
}) {
  // ... existing auth + path validation ...

  // Dedup pre-check: if profile already has a completed resume with same hash,
  // skip insert entirely and return the existing id.
  const { data: existingByHash } = await supabase
    .from('resumes')
    .select('id')
    .eq('profile_id', user.id)
    .eq('file_hash', input.fileHash)
    .eq('status', 'complete')
    .maybeSingle();
  if (existingByHash) {
    revalidatePath('/dashboard');
    return { success: true, id: existingByHash.id, deduped: true };
  }

  // Insert with hash included
  const { data, error } = await supabase
    .from('resumes')
    .insert({
      profile_id: user.id,
      raw_file_url: publicUrl,
      file_name: input.fileName,
      file_hash: input.fileHash,    // ← new
    })
    .select('id')
    .single();
  // ...

  // Storage write already succeeded by the time we get here.
  // Inngest send is the only thing that can fail past this point.
  try {
    await inngest.send({
      name: 'resume/uploaded',
      data: { resumeId: data.id, profileId: user.id },
    });
  } catch (sendError) {
    return {
      success: false,
      kind: 'inngest_send_failed' as const,
      resumeId: data.id,                // ← so the UI can retry the send without re-upload
      error: sendError instanceof Error ? sendError.message : 'queue unavailable',
    };
  }

  revalidatePath('/dashboard');
  return { success: true, id: data.id };
}
```

Why the hash dedup also runs in the action (not only inside the function): if the candidate re-uploads, we don't want to insert a redundant row at all — saves a `resumes` row and skips the Inngest run. The function-side `check-dedup` is a second safety net for the rare case of two near-simultaneous uploads from the same profile (race) where the first hasn't completed yet — in that case we keep both rows but the second copies parsed JSON from the first when it finishes.

**Error boundary contract** (encoded in the action's return shape, surfaced by the upload UI):

| Failure point | Storage write | Row insert | Inngest send | UI message | Action |
|---|---|---|---|---|---|
| Storage upload fails | ❌ | — | — | "Upload failed — try again" | Re-upload file |
| Row insert fails after upload | ✅ | ❌ | — | "Upload saved, couldn't queue — try again" | Re-call `insertResumeRow` (idempotent on `raw_file_url`) |
| **Inngest send fails after row insert** | ✅ | ✅ | ❌ | "Resume saved, processing queue temporarily unavailable — try again" | Call new `retryParseResume(resumeId)` action that only re-sends the event |

Add a sibling server action:

```ts
export async function retryParseResume(resumeId: string) {
  // Verify the row belongs to the signed-in user, status is 'uploading' or 'failed'
  await inngest.send({ name: 'resume/uploaded', data: { resumeId, profileId: user.id } });
}
```

The "try again" button binds to this — never re-uploads the file.

**`src/app/api/parse-resume/route.ts`** — **gut it**. This route can either be deleted entirely (cleanest) or reduced to a 410 Gone stub for safety during deploy. Recommend delete + a brief migration commit message noting the move to Inngest. Nothing else POSTs to it.

**`src/inngest/functions/parse-resume.ts`** — the actual pipeline. Each phase is its own `step.run()` so Inngest retries each one independently (default 4 retries, exponential backoff):

```ts
export const parseResume = inngest.createFunction(
  { id: 'parse-resume', retries: 2, concurrency: { limit: 10 } },
  { event: 'resume/uploaded' },
  async ({ event, step }) => {
    const { resumeId } = event.data;
    const supabase = createServiceClient();

    await step.run('mark-processing', async () => {
      await supabase.from('resumes').update({
        status: 'processing',
        parse_started_at: new Date().toISOString(),
      }).eq('id', resumeId);
    });

    const resume = await step.run('fetch-row', async () => {
      const { data } = await supabase.from('resumes')
        .select('id, profile_id, raw_file_url, file_hash')
        .eq('id', resumeId).single();
      return data;
    });

    // Dedup: short-circuit if another resume with same hash already parsed
    const duplicate = await step.run('check-dedup', async () => {
      if (!resume?.file_hash) return null;
      const { data } = await supabase.from('resumes')
        .select('id, parsed_json, ats_score, seniority_level, total_years_exp')
        .eq('profile_id', resume.profile_id)
        .eq('file_hash', resume.file_hash)
        .neq('id', resumeId)
        .eq('status', 'complete')
        .maybeSingle();
      return data;
    });

    const buffer = await step.run('download-pdf', async () =>
      fetchFromStorage(resume.raw_file_url)
    );

    const parsed = duplicate
      ? duplicate.parsed_json
      : await step.run('parse-claude', async () => parseResume(buffer));

    const scoring = duplicate
      ? duplicate.parsed_json.scoring
      : await step.run('score-claude', async () => scoreResume(parsed));

    await step.run('write-result', async () => {
      await supabase.from('resumes').update({
        parsed_text: parsed.raw_text,
        parsed_json: { ...parsed, scoring },
        ats_score: scoring.overall,
        seniority_level: parsed.seniority_level,
        total_years_exp: parsed.total_years_exp,
        status: 'complete',
        parsed_at: new Date().toISOString(),
        is_current: true,
        parser_model: PARSER_MODEL,
        scorer_model: SCORER_MODEL,
        prompt_version: PROMPT_VERSION,
      }).eq('id', resumeId);
    });

    await step.sendEvent('notify-loops', {
      name: 'candidate/resume_parsed',
      data: { resumeId, profileId: resume.profile_id, atsScore: scoring.overall },
    });
  }
);
```

Failure model: if any `step.run` exhausts retries, Inngest invokes a registered failure handler — wire one to set `status='failed'` + `parse_error=<message>`. The Realtime hook already surfaces the failure toast.

The `candidate/resume_parsed` event becomes the hook point for Loops (transactional email) and any other downstream consumers; it's free since the function exists either way.

### 5. Prompt caching

System prompts (parser + scorer rubric) are ~2K tokens each. Mark them as `cache_control: { type: 'ephemeral' }` in the API call. Cache hit after the first call of each 5-minute window cuts cost ~80% on the cached portion. At your expected volume this is meaningful.

### 6. Evals

New top-level `evals/` directory (not shipped in production build):

```
evals/
  parser/
    fixtures/        # 30-50 PDF resumes only (DOCX deferred); mix of clean, multi-column, designer, scanned
    ground-truth/    # one .json per fixture: expected skills, companies, dates
    run.ts           # iterates fixtures, calls parseResume, computes F1/exact-match
  scorer/
    pairs.json       # 50 hand-ranked pairs: { strong_id, weak_id, reason }
    rubric-checks.ts # deterministic per-dimension assertions (e.g. "12yr tenure → tenure ≥ 80")
    run.ts           # pairwise accuracy + rubric pass rate
  shared/
    fixtures-loader.ts
    report.ts        # writes JSON + markdown report
package.json scripts:
  "eval:parser": "tsx evals/parser/run.ts",
  "eval:scorer": "tsx evals/scorer/run.ts",
  "eval:all":    "npm run eval:parser && npm run eval:scorer"
```

**Targets to track over time:**
- Parser: skills F1 ≥ 0.85, company exact-match ≥ 0.95, date parse ≥ 0.90.
- Scorer: pairwise accuracy ≥ 0.85, rubric-check pass rate ≥ 0.95.
- Production drift: p50/p90 of `ats_score` tracked weekly; alert if shifts > 5 points week-over-week (separate job, not in this plan).

**When evals run:**
- Manually before any prompt-version bump or model swap (`npm run eval:all`).
- CI gate on PRs touching `src/lib/llm/prompts/**` (separate task; out of scope for this plan).

### 7. Cost / latency baseline

At a 2-page senior resume:
- Parser (Haiku, ~6K input, ~1K output): ~$0.011, ~2-3s.
- Scorer (Sonnet, ~1.5K input cached + 1K input + 800 output): ~$0.013, ~3-4s.
- **Total ~$0.024 and ~6s per resume.** User has navigated away; latency invisible.

---

## Critical files to modify

- `supabase/migrations/<new>_resume_llm_metadata.sql` (new)
- `supabase/migrations/<new>_resumes_bucket_pdf_only.sql` (new) — revert the DOCX allowance from `20260515120000_resumes_bucket_allow_doc_docx.sql`
- `env.ts` — add `ANTHROPIC_API_KEY`, parser/scorer model env vars, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- `package.json` — add `@anthropic-ai/sdk`, `inngest`; add eval scripts; add `inngest:dev` script (`inngest-cli dev`)
- `src/app/actions/resume.ts` — replace `kickoffParseResume` POST with `inngest.send('resume/uploaded', ...)`
- `src/app/api/parse-resume/route.ts` — **delete** (or stub to 410 Gone)
- `src/lib/pdf-extract.ts` — remove `extractPdfText` stub (keep LinkedIn export helper)
- `src/types/database.types.ts` — regenerate via `npm run supabase:types`
- Upload UI copy (dropzone in `src/hooks/use-supabase-upload.ts` and its consumer) — restrict to PDF, update accept hints
- `src/lib/llm/*`, `src/inngest/*`, `src/app/api/inngest/route.ts` (all new — see file table)
- `evals/*` (all new)

## Critical files to read but not modify

- `src/hooks/use-resume-notifications.ts` (or equivalent) — Realtime channel + invalidation key; consider adding a stale-`uploading` timeout check so a failed `inngest.send()` doesn't leave the UI stuck.
- `src/lib/query-keys.ts` — Resume key already used by the notification hook.
- `src/lib/supabase/service.ts` — service-role client; reused inside the Inngest function.

---

## Verification

End-to-end:
1. `npm run supabase:types` — confirm new columns appear in generated types.
2. In one terminal: `npx inngest-cli@latest dev` (Inngest dev server on `:8288`). In another: `npm run dev`. Log in, upload a known-good PDF resume.
3. In the Inngest dev GUI (`localhost:8288`): confirm the `resume/uploaded` event arrived, the `parse-resume` function ran, each `step.run` shows green, total duration is sane (~6-10s).
4. Watch the row in Supabase: `status` flips `uploading → processing → complete`; `parsed_json` is well-formed; `ats_score` is set; `parser_model`/`scorer_model`/`prompt_version` populated.
5. Confirm Sonner toast fires once on completion (no double-fire).
6. Try uploading a DOCX — verify the bucket rejects it and the UI surfaces a clear "PDF only" error.
7. Upload a deliberately bad file (corrupted PDF) — verify retries fire in the Inngest GUI, then `status=failed`, `parse_error` populated, failure toast fires.
8. Re-upload the same resume — two dedup paths to verify:
   a. **Action-level dedup (fast path):** the upload action returns `{ success: true, deduped: true }` and **no new `resumes` row is inserted**. The existing row remains `is_current=true`.
   b. **Function-level dedup (race path):** simulate by uploading two distinct files with the same hash within ~1s (e.g., kick off two parallel uploads). Both rows insert, but the second function run's `check-dedup` step hits, `parse-claude` / `score-claude` are skipped, and the second row still completes with `is_current=true` — confirm the trigger demoted the first row to `is_current=false` with `superseded_at` set.
9. Force an Inngest send failure (e.g., set `INNGEST_EVENT_KEY` to an invalid value locally) — verify the action returns `{ kind: 'inngest_send_failed', resumeId }`, UI shows the "queue temporarily unavailable" message, the "try again" button calls `retryParseResume(resumeId)` only (no re-upload), and on success the existing row processes normally.

Evals:
8. Place 5 known fixtures in `evals/parser/fixtures/` with ground truth. Run `npm run eval:parser` — verify metrics print and a report file is written.
9. Place 5 pairwise comparisons. Run `npm run eval:scorer` — verify pairwise accuracy reported.

Production safety:
9. Confirm `ANTHROPIC_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` are only read server-side (no `NEXT_PUBLIC_` prefix; not imported anywhere under `'use client'`).
10. Service client is reused inside the Inngest function (not the anon client — RLS would silently fail the update).
11. Register the deployed Inngest endpoint (`https://<host>/api/inngest`) in the Inngest dashboard and verify it shows green sync status.
12. Upload a second different resume — verify the prior row flips to `is_current=false`, `superseded_at` is set, and only one row per `profile_id` has `is_current=true`.
13. Confirm the upload action `await`s `inngest.send` and surfaces errors (rather than silently swallowing). The old `void fetch(...).catch(noop)` pattern is gone.
