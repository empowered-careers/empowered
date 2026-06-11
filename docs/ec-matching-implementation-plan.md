# Matching Engine Implementation Plan (M0–M4)

> Created: 2026-06-11
> Derived from: `ec-matching-sprint-plan.md` v3.1 (the spec) + live codebase exploration.
> Status: saved for discussion — not yet started.

## Context

Build the retrieval-funnel matching engine specced in `docs/ec-matching-sprint-plan.md` (v3.1): candidates' parsed resumes and admin-curated JDs get embedded, a Stage 0 hard filter + Stage 1 composite score materializes top-K rows into `matches`, and each surfaced match carries a templated one-line `light_reason` — all with zero candidate action. M5 (Deep Dive) is **out of scope** for this effort; nothing here precludes it.

### Decisions made in planning (deltas vs the sprint doc)

| Decision                                        | Outcome                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Embedding provider                              | **Hosted Gemini `gemini-embedding-001` @ `output_dimensionality: 768`** (generous free tier, no card; MRL with 768 a recommended size) instead of self-hosted VPS. `halfvec(768)` lock unchanged; later swap to self-hosted EmbeddingGemma-300M (same 768d/MRL lineage) = env change + re-embed backfill.                                |
| S4 keyword matcher                              | Doesn't exist in code. **Folded into M4**: keyword-overlap computed in TS inside the match function, as Stage 1 input + 2a noun source. No standalone deliverable.                                                                                                                                                                       |
| Profile target facets                           | Doc's plan to add `target_seniority`/`open_to_remote`/`salary_expectation_min` to `profiles` is **obsolete** — `candidate_preferences` already stores target_seniority, remote_preference, comp/salary mins, blocklist_companies, etc. Stage 0/1 joins it. Doc's M2 "Role Clarity writes facets" already satisfied by onboarding survey. |
| `match_deep_dives`, `employers.company_profile` | Deferred to M5 (purely additive later).                                                                                                                                                                                                                                                                                                  |
| `job_scores`                                    | Stays unwritten for now. Engine renormalizes to semantic+keyword when a job has no/zero weights row. Admin weight inputs are a follow-up, not exit criteria.                                                                                                                                                                             |

### Open discussion (raised 2026-06-11, undecided)

Structured-field-only matching (years exp, remote pref, seniority, industry, role targeting vs JD fields) as an easier v1, deferring embeddings. Assessment: structured fields are already Stage 0 + soft penalties in this plan; embeddings rank _within_ the eligible pool (where structured signal exhausts) and handle title-text brittleness ("Engineering Manager" vs "Head of Engineering"). A structured+keyword v1 would cut ~half the work (drop M0, `embed.ts`, embed pipelines, embedding columns); the migration's `matches` columns, scoring/templating modules, and all UI carry over unchanged, so the embedding layer can slot underneath later — the doc's original S4-then-engine sequencing. Hybrid option: ship structured+keyword v1 but include embedding columns/extension in the M1 migration so the semantic layer is later purely additive code.

### Verified existing infrastructure (reuse, don't rebuild)

- Inngest: `src/inngest/client.ts` (typed events), `src/inngest/functions/parse-resume.ts` (canonical pattern: steps, retries 2, concurrency 5, onFailure), served from `src/app/api/inngest/route.ts`. Parse already emits `candidate/resume_parsed`.
- LLM lib `src/lib/llm/` (anthropic.ts, schemas.ts, prompts.ts versioned); env Zod schema in `env.ts`; eval harness `evals/`.
- SQL helpers: `can_see_job_tier(plan, job_tier)` (20260605000030), `is_admin()` (20260520000000); resume supersession trigger exists; `createServiceClient()` at `src/lib/supabase/service.ts`.
- Admin job CRUD (`src/components/admin/job-form.tsx`, `src/app/actions/jobs.ts`); jobs table has `requirements` jsonb, `expires_at`, `status` enum.
- `matches` table with `UNIQUE(profile_id, job_id)`; types convention in `src/types/db.ts` (`*_COLUMNS` + `Pick<>`); query keys in `src/lib/query-keys.ts`; pgvector 0.8.0 available but **not installed**.

### Change surface on existing code (nearly all work is additive)

Existing backend files touched (small edits): `env.ts` (+6 vars), `src/lib/llm/schemas.ts` + `prompts.ts` (+`primary_domain`, version bump), `parse-resume.ts` (+1 column write), `src/inngest/client.ts` (+4 events), `route.ts` (register functions), `src/app/actions/jobs.ts` (+2 fields, +1 event emit), `db.ts`/`query-keys.ts` (additive). Existing UI touched: admin job form (+2 fields), dashboard placeholder copy → matches teaser link. No current flow changes behavior.

---

## PR 1 — M0+M1: embed client + DB foundations

### env.ts additions (all optional/defaulted so dev boots without keys)

```
EMBEDDING_PROVIDER: z.enum(["gemini", "openai_compat"]).default("gemini")
GEMINI_API_KEY: optional
EMBEDDING_BASE_URL / EMBEDDING_API_KEY: optional   // openai_compat (future self-host)
EMBEDDING_MODEL: default "gemini-embedding-001"
EMBEDDING_VERSION: default "1"                     // bump ⇒ re-embed backfill
```

### `src/lib/llm/embed.ts` (provider-agnostic)

- Exports: `EMBEDDING_DIM = 768`, `EMBEDDING_MODEL_ID` (`"${provider}:${model}"`, written to `embedding_model`), `EMBEDDING_VERSION`, `embedTexts(texts: string[]): Promise<number[][]>`, `toVectorLiteral(v): string`.
- Gemini: `POST .../models/{model}:batchEmbedContents` (`x-goog-api-key` header), per-request `taskType: "SEMANTIC_SIMILARITY"` (symmetric — same on both sides), `outputDimensionality: 768`, chunk at 100/call.
- **Always L2-normalize returned vectors** (Gemini requires it for non-3072 dims; idempotent for other providers). Validate length 768, throw otherwise.
- openai_compat: `POST ${EMBEDDING_BASE_URL}/v1/embeddings` bearer-auth — the entire future self-host swap.
- Throw if configured provider's key missing (mirrors `getAnthropic()`).

### Pre-migration audit (manual SQL, Studio/MCP)

`SELECT seniority_level, count(*) FROM resumes GROUP BY 1;` — normalize any stray values in the migration before adding the CHECK.

### Migration `supabase/migrations/20260612000000_matching_foundations.sql`

- `CREATE EXTENSION IF NOT EXISTS vector;`
- `seniority_rank(text) RETURNS int` immutable SQL function (ic=1 … c_level=7), vocabulary = the parser's Zod enum.
- `resumes`: add `embedding halfvec(768)`, `embedding_model`, `embedding_version`, `embedded_at`, `match_blob text`, `primary_domain text`; CHECK on existing `seniority_level` (nullable, 7 values).
- `jobs`: same embedding+provenance quartet + `match_blob`; `seniority_level text` (same CHECK), `years_experience_min int` (>= 0).
- `matches`: add `score_breakdown jsonb`, `match_version text`, `matched_at timestamptz`, `light_reason text`.
- HNSW `halfvec_cosine_ops` indexes on both embedding columns (per locked spec; no tuning).
- RLS: admin overlay `FOR ALL ... is_admin()` on `matches` and `job_scores` (engine itself writes via service role). `resumes` stays own-rows; note `jobs` SELECT is `using(true)` so blob/embedding readable by signed-in users — acceptable, no PII.

### After migration

`npm run supabase:types`; add `MatchRow`/`MatchInsert`/`JobScoresRow` (+ `SeniorityLevel` alias if absent) to `src/types/db.ts`; sync `docs/db_schema.md` **including the pre-existing `resume_score` drift** the sprint doc flags.

**Verify:** curl Gemini returns 768-length vector; hand-insert a vector literal in Studio and run a `<=>` cosine probe across resumes↔jobs; `npm run type-check`.

---

## PR 2 — M2: resume side

1. **`primary_domain` in the parse pass:** add nullable field to `ParsedResumeSchema` (`src/lib/llm/schemas.ts`), extend parse prompt (`src/lib/llm/prompts.ts`), bump `RESUME_PROMPT_VERSION` → `1.1.0` in `env.ts`, write column in `parse-resume.ts` write-result step. Run `npm run eval:parser` (nullable field should be backward-compatible with fixtures).
2. **`src/lib/matching/blob.ts`:** `buildResumeMatchBlob(parsed)` — labeled plaintext: seniority, years, domain, full `Skills:` list, per-role `Title @ Company (dates)` + top bullets, education; ~6,000 char cap (Gemini 2,048-token input). **Resume-only by design** — preferences are filters, not embedded content, so preference edits never trigger re-embeds (keeps the doc's three re-embed triggers exact). `buildJobMatchBlob(job)` — title, company, seniority, years floor, remote/location, description, flattened `requirements`.
3. **`src/inngest/functions/embed-resume.ts`** — _new function_ on existing `candidate/resume_parsed` event (separate from parse-resume: independent retries; an embedding outage can never mark a parse `failed`). Steps: fetch row (skip if not `is_current`) → build blob + `embedTexts` → write `match_blob`/`embedding`/provenance → `sendEvent("match/candidate-changed", { profileId })`. `onFailure`: log only — null `embedding` is the backfill retry signal. Register in `src/app/api/inngest/route.ts`.
4. **`src/inngest/functions/backfill-embeddings.ts`** — on new `backfill/embeddings` event (`{ target: "resumes" | "jobs" }`): select current/complete rows where `embedding IS NULL OR embedding_version <> EMBEDDING_VERSION`, re-emit the per-row pipeline events in chunks. Triggered from the Inngest dashboard — no admin UI.
5. New event types in `src/inngest/client.ts`: `match/candidate-changed { profileId }`, `backfill/embeddings { target }` (plus PR 3's below — land them together if convenient).

**Verify:** dev upload (`npm run dev` + `npx inngest-cli dev`) → row gains blob + 768d embedding + provenance; supersession re-upload demotes old row and embeds new; backfill event embeds all current resumes; type-check/lint.

---

## PR 3 — M3: JD side (parallel with PR 2)

1. **`src/app/actions/jobs.ts`:** add `seniority_level` / `years_experience_min` to `JobInput`; after successful create/update, `inngest.send("job/upserted", { jobId, contentChanged })` in try/catch (failure logs, action still succeeds; backfill catches strays). `contentChanged` = diff of content fields (title/company/location/remote/description/seniority/years) vs fetched current row; **status-only or tier-only edits ⇒ `false`** (doc's "never status-only" rule).
2. **`src/components/admin/job-form.tsx`:** `seniority_level` select (required for new jobs — Stage 0 needs it; reuse the existing `TIERS`/`REMOTE` constant-array pattern) + optional `years_experience_min` number input. _Cut from doc:_ Claude pre-fill of these two fields — not worth an LLM call.
3. **`src/inngest/functions/embed-job.ts`** on `job/upserted`: if `contentChanged || embedding IS NULL` → build blob; skip embed call if blob unchanged and version matches (no-op idempotency); else embed + write. Then: if `status='active'` emit `match/job-changed { jobId }`; if inactive, delete that job's matches where `candidate_interested IS DISTINCT FROM true` (dead roles leave the surface, expressed interest preserved).
4. Extend backfill `target: "jobs"` → emit `job/upserted` (`contentChanged: false`) for active jobs missing/stale embeddings.

**Verify:** create+edit job in `/admin/jobs` → embedding written; no-op save skips API call (Inngest logs); status flip doesn't re-embed but cleans matches; backfill covers active jobs; form walkthrough; type-check/lint.

---

## PR 4 — M4a: matching engine

### Stage 0+1 SQL — migration adding `match_candidate_jobs(p_profile_id uuid, p_limit int DEFAULT 40)`

Service-role-only (`REVOKE EXECUTE ... FROM anon, authenticated`), called via `supabase.rpc` from Inngest. One statement:

- CTE `cand`: current resume embedding + `total_years_exp`/`seniority_level`, `profiles.plan`, `candidate_preferences` (remote_preference, blocklist_companies), `candidate_scores` 6 dims.
- Over `jobs LEFT JOIN job_scores`, **hard filters only** (doc's unambiguous set): `status='active'` + not expired; `embedding IS NOT NULL`; `can_see_job_tier(plan, job_tier)`; company not in blocklist (case-insensitive); extreme floors with grace — `seniority_rank(cand) >= seniority_rank(job) - 2`, `years >= job.years_experience_min - 3` (NULLs pass).
- Returns per job: `semantic = 1 - (j.embedding <=> c.embedding)`, `dim_score` = normalized `candidate_scores · job_scores` weights (NULL when weights row missing/zero or candidate unscored), `dim_detail` jsonb (per-dimension contributions, for 2a), `match_blob`. Ordered by semantic, `LIMIT p_limit` (40 = top-K buffer; final composite reshuffles in TS, safe since semantic-dominant).

### `src/lib/matching/score.ts` (pure functions) + `src/lib/matching/light-reason.ts`

- `extractOverlapTerms(skills, jobBlob)`: case-insensitive match of `parsed_json.skills` entries against the job blob; return matched terms (original casing, longest-first), cap 8. `kwScore = min(1, matched/8)`.
- Composite: `0.55·semantic + 0.30·dim + 0.15·kw` (constants; doc's 60/40 adapted for the third term — tune with Lauren, open decision #3). When `dim` is NULL, renormalize over semantic+kw.
- **Soft signals down-rank, stay visible** (per doc philosophy): multiplicative penalties recorded in breakdown — remote mismatch ×0.85, salary floor above `jobs.salary_max` ×0.85.
- `match_score = round(100 × composite)`; `score_breakdown` jsonb = `{ semantic, dim_score, dim_detail, keyword: { score, terms }, weights, penalties }` (persisting overlap terms here is what M5/2a reuse).
- `buildLightReason(breakdown)`: top-2 dims from `dim_detail` (human labels) + up to 3 overlap terms into ~6 template variants; variant picked by stable hash of `profileId+jobId` (variety across cards, deterministic per pair). Fallback ladder: terms-only → dims-only → generic. **No LLM call**; Haiku rephrase stays a drop-in upgrade if output reads robotic.

### Inngest functions

- **`match-candidate.ts`** on `match/candidate-changed`; retries 2, concurrency 5, `debounce: { key: profileId, period: "60s" }` (absorbs parse→embed bursts). Steps: rpc → fetch skills + soft-signal prefs → score/sort/top-K (K=20) in-process → upsert `matches` (`onConflict: "profile_id,job_id"`) with score, breakdown, `light_reason`, `match_version: "match_v1"` (code constant), `matched_at` → cleanup `DELETE ... WHERE profile_id = X AND (matched_at IS NULL OR matched_at < runStart) AND candidate_interested IS DISTINCT FROM true`.
- **`match-job-fanout.ts`** on `match/job-changed`: select eligible candidates (current resume with embedding), emit `match/candidate-changed` in chunks ≤512. Debounce+concurrency on match-candidate is the throttle. One scoring path — no separate job-centric SQL.

**Verify:** seed 1 real resume + 4–5 jobs across tiers/seniorities; probe `SELECT * FROM match_candidate_jobs('<uid>', 40)`; re-upload resume → `matches` rows carry score/breakdown/light_reason/version/timestamp; targeted rows confirm tier/blocklist/seniority exclusions; expire a job → non-interested matches vanish; read 10 light_reasons for robotic-ness; type-check/lint.

---

## PR 5 — M4b: minimal match UI

- `src/types/db.ts`: `MATCH_CARD_COLUMNS` (`id, job_id, match_score, light_reason, matched_at, candidate_interested`) + `MatchCardFields`; joined select reuses existing `JOB_CARD_COLUMNS` via `jobs:job_id(...)`.
- `src/lib/query-keys.ts`: `matches.forUser(userId)`.
- `src/app/(app)/matches/page.tsx` (server): fetch user's matches ordered by score desc + plan; pass `initialData` per the CLAUDE.md server/client split.
- `src/components/matches/matches-client.tsx` (client): hydrate TanStack Query; cards = score badge, job card fields (reuse job-board card styling), `light_reason`, link to `/job-board/[id]`; render-time `canSeeJobTier` re-check (plan may have changed since matching); empty states ("upload a resume" / "computing").
- Dashboard: swap placeholder match copy in `dashboard-client.tsx` for a "View your matches (N)" teaser link (one count query on the server page).
- **Skipped for M4:** realtime match toasts / `match_created` feed wiring (`NotificationType` already reserves it — clean follow-up).

**Verify:** `/matches` renders from initialData with no spinner; tier re-check works by flipping plan; `npm run build`.

---

## Risks / follow-ups (flagged, not in scope)

1. **Weights/penalties are placeholder constants** in `score.ts` — tune on first cohort with Lauren; changing them ⇒ bump `match_version` + re-run fan-out.
2. **`job_scores` unpopulated** ⇒ dim term absent initially; light_reason leans on keyword templates. Decide later whether the admin job form grows weight inputs (Lauren can seed via Studio meanwhile).
3. **Plan upgrades don't re-trigger matching** (Pro upgrade won't surface tier_3 matches until next event). Cheap follow-up: emit `match/candidate-changed` from the Stripe plan-update path.
4. **Gemini free-tier limits**: batch endpoint + concurrency 5 keeps volume tiny; Inngest retries absorb 429s. Provider swap = env change + `EMBEDDING_VERSION` bump + backfill (cross-model vectors incompatible).
5. **Sparse `parsed_json.skills`** would weaken keyword overlap — contained fix in `extractOverlapTerms` (widen to experience bullets).
6. **PR 4 cleanup deletes legacy `matches` rows** lacking `matched_at` (unless interested) — confirm with Lauren no hand-curated matches exist before shipping.
7. Update `docs/ec-matching-sprint-plan.md` (M0 hosted-provider pivot, preferences simplification) in PR 1's doc pass.
