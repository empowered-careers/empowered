# Empowered Careers — Matching Engine Sprint Plan (Retrieval Funnel) — v3.1

> Last updated: 2026-06-10
> Supersedes: v2 (live-verified), v1 (doc-derived)
> **v3 change: Stage 2 redesigned — auto light reasoning + candidate-initiated, quota-gated Deep Dive.**
> **v3.1 change: 2a one-liner is templated from Stage 1 output (score_breakdown + keyword overlap) — no LLM call.**
> Verified against live Supabase project `empowered` (wpurdayfjsyiedabmipt, PG 17).
> Relation to `ec-dev-plan.md`: build-out of **E4 / P2-2**. Phase 1 keyword matching (S4) ships as-is.

---

## Decisions locked

| Decision                             | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vector store                         | **pgvector in Supabase.** Pinecone ruled out — matching is a filtered relational join; splitting source of truth adds a sync surface for zero benefit at EC scale.                                                                                                                                                                                                                                                                                                                                                                                             |
| Embedding provider                   | **Self-hosted open model on existing Hetzner VPS** (TEI or Ollama) behind provider-agnostic `embed.ts`. Vendor-reduction play. Hosted API fallback is an env swap.                                                                                                                                                                                                                                                                                                                                                                                             |
| Model shortlist                      | EmbeddingGemma-300M (768d, MRL, <200MB RAM) leading; nomic-embed-text, BGE-M3 alternatives. CPU-viable.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Dimension                            | **`halfvec(768)`** — locked at M1; changing later = re-embed + reindex.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Filter philosophy                    | Hard-exclude only the unambiguous (Plan/Job Tier, `status`, extreme seniority floor). Soft signals **down-rank, stay visible** — for senior ICP, false excludes cause churn.                                                                                                                                                                                                                                                                                                                                                                                   |
| **Stage 2 model (v3, refined v3.1)** | **Two tiers.** (2a) Auto light reasoning: one-liner per surfaced match **templated directly from Stage 1 output — `score_breakdown` top dimensions + S4 keyword-overlap terms. No LLM call: free, deterministic, no API failure mode in the matching engine.** Haiku rephrase pass is a drop-in upgrade if templates read robotic. (2b) **Deep Dive: candidate-initiated, quota-gated per Plan, cached per (profile, job, resume version).** Cost scales with engagement, not pool size; the expensive layer becomes a gated product and a conversion surface. |
| Full VPS migration                   | Rejected. Auth/RLS/Realtime stay on Supabase.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

---

## The funnel (v3)

| Stage                       | Method                                                                                   | Trigger                                   | Cost                                |
| --------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------- |
| **0 — Hard filter**         | Indexed SQL `WHERE`                                                                      | automatic                                 | ~free                               |
| **1 — Rankable similarity** | pgvector cosine + dimension dot-product → top-K into `matches`                           | automatic (event-driven)                  | cheap                               |
| **2a — Light reasoning**    | Templated from `score_breakdown` top dimensions + keyword-overlap terms — no LLM call    | automatic, top-N only                     | free                                |
| **2b — Deep Dive**          | Full Claude analysis: gap analysis, company-values fit, interview angle, resume emphasis | **candidate request, quota-gated, async** | the cost driver — now demand-priced |

Stages 0–2a keep the match surface alive with zero candidate action. 2b is the premium artifact.

---

## Live schema findings (verified 2026-06-10)

| Finding                                                                                                    | Impact                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `vector` ext available (0.8.0, halfvec) but **NOT installed**                                              | M1 creates it.                                                                                                                             |
| `resumes` score column is **`resume_score`**, not `ats_score`                                              | Use real name; fix `db_schema.md` in M1 doc pass.                                                                                          |
| `resumes` already has `seniority_level` (text) + `total_years_exp` (numeric)                               | Resume-derived facets live on `resumes` (read via `is_current`), not `profiles`. Only assessment-derived _target_ facets go on `profiles`. |
| `resumes.seniority_level` unconstrained text                                                               | Constrain (CHECK/enum) to a vocabulary shared with jobs; audit live values first.                                                          |
| No `summary` column on live `resumes`                                                                      | Build + store `match_blob` explicitly from `parsed_json`.                                                                                  |
| `resumes` provenance pattern (`parser_model`/`scorer_model`/`prompt_version`/`file_hash`)                  | Mirror for embeddings and Deep Dives.                                                                                                      |
| `jobs` missing seniority/years — confirmed                                                                 | M1 adds. Live extra: `client_company_id`.                                                                                                  |
| `matches` **`UNIQUE (profile_id, job_id)` verified ✓**                                                     | Upsert safe. Add `score_breakdown`, `match_version`, `matched_at`, `light_reason`.                                                         |
| `candidate_scores.culture_axes` (jsonb) live extra                                                         | Feed into Deep Dive prompt — free values-fit signal.                                                                                       |
| `profiles` live extras: `role` (user_role), `employer_id`, `internal_notes`, `lead_id`, acquisition fields | New RLS must account for `profiles.role` admin policies.                                                                                   |
| `candidate_scores` / `job_scores` dimensions match docs ✓                                                  | Stage 1 dimension side reusable as-is.                                                                                                     |

> `db_schema.md` lags live. All schema work starts from live introspection; doc updated in the same PR.

---

## Schema deltas — by side

### Resume / candidate side

| Column                                                           | Where      | Type                    | Status                                                                   |
| ---------------------------------------------------------------- | ---------- | ----------------------- | ------------------------------------------------------------------------ |
| `embedding`                                                      | `resumes`  | `halfvec(768)`          | add                                                                      |
| `embedding_model` / `embedding_version` / `embedded_at`          | `resumes`  | text/text/timestamptz   | add                                                                      |
| `match_blob`                                                     | `resumes`  | text                    | add — distilled matchable profile from `parsed_json`; what gets embedded |
| `seniority_level`                                                | `resumes`  | constrain existing text | exists; constrain                                                        |
| `total_years_exp`                                                | `resumes`  | numeric                 | exists ✓                                                                 |
| `primary_domain`                                                 | `resumes`  | text                    | add (same parse pass)                                                    |
| `target_seniority` / `open_to_remote` / `salary_expectation_min` | `profiles` | enum/bool/int, nullable | add — from Role Clarity assessment                                       |

### JD / job side

| Column                        | Where       | Type                                 | Status                                                                                                       |
| ----------------------------- | ----------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `embedding` + provenance trio | `jobs`      | halfvec(768) + text/text/timestamptz | add                                                                                                          |
| `match_blob`                  | `jobs`      | text                                 | add — title + requirements + must-haves                                                                      |
| `seniority_level`             | `jobs`      | shared constrained type              | add — confirmed missing                                                                                      |
| `years_experience_min`        | `jobs`      | int, nullable                        | add                                                                                                          |
| `company_profile`             | `employers` | jsonb                                | **add (v3)** — Lauren-curated values/culture/context per employer; primary Deep Dive source alongside the JD |

### Engine / shared

| Change                                                                          | Where                  | Status                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CREATE EXTENSION vector`                                                       | DB                     | required — verified not installed                                                                                                                                                                                                                                                                                                                      |
| HNSW (`halfvec_cosine_ops`)                                                     | both embedding columns | add; no tuning                                                                                                                                                                                                                                                                                                                                         |
| `score_breakdown` jsonb, `match_version`, `matched_at`, **`light_reason` text** | `matches`              | add                                                                                                                                                                                                                                                                                                                                                    |
| **`match_deep_dives` table (v3)**                                               | new                    | `id, profile_id, job_id, match_id, resume_id` (version anchoring), `content` jsonb, `model`, `prompt_version`, `used_web_search` bool, `status` (requested/generating/complete/failed), `requested_at/generated_at`, error col. `UNIQUE (profile_id, job_id, resume_id)` → cache key; re-view never re-generates. RLS: candidate reads own; admin all. |
| Quota                                                                           | none                   | **no new table** — daily limit = `COUNT(*)` of today's `match_deep_dives` rows per profile. Plan-based limit in a config map.                                                                                                                                                                                                                          |
| `UNIQUE (profile_id, job_id)` on `matches`                                      | —                      | verified ✓                                                                                                                                                                                                                                                                                                                                             |

---

## Sprints

### Sprint M0 — Embedding service on the VPS (2–3 days, parallel with M1)

- [ ] TEI/Ollama container on Hetzner serving chosen model; **lock the model** (fixes halfvec(768)) — benchmark on 5–10 real resume/JD pairs if undecided
- [ ] Token auth + firewall; HTTPS via existing Cloudflare; health check + restart policy
- [ ] `EMBEDDING_BASE_URL` / `EMBEDDING_MODEL` / `EMBEDDING_VERSION` env; hosted-API fallback documented (env-only swap)

**Exit:** curl returns a 768-dim vector; fallback swap works without code change.

### Sprint M1 — DB foundations (1 wk)

- [ ] Migrations: extension; embedding + provenance + `match_blob` on `resumes`/`jobs`; jobs seniority/years; constrain `resumes.seniority_level` (audit values first); `primary_domain`; profile target facets; `matches` additions incl. `light_reason`; **`match_deep_dives` table; `employers.company_profile`**
- [ ] HNSW indexes; RLS in same migrations (account for `profiles.role`)
- [ ] `src/lib/llm/embed.ts` (batch, provider-agnostic); `match_blob` builders both sides
- [ ] `npm run supabase:types`; sync `db_schema.md` including pre-existing drift

**Exit:** hand-embed + cosine query works; doc matches live.

### Sprint M2 — Resume side (1 wk)

- [ ] Extend Inngest `parse-resume`: blob → embed → write vector + provenance; extract `primary_domain` same pass
- [ ] Role Clarity assessment writes target facets to `profiles`
- [ ] Supersession re-embeds; queries filter `is_current`
- [ ] Emit `candidate/embedded`; backfill batch over existing current resumes

### Sprint M3 — JD side (1 wk)

- [ ] Job admin: required `seniority_level` dropdown + optional years floor; optional Claude pre-fill, Lauren confirms
- [ ] **Employer admin: `company_profile` editor** — values, culture notes, context Lauren already knows (one-time per employer, feeds every Deep Dive for their roles)
- [ ] Inngest `embed-job` on create/copy-edit (not status-only changes); emit `job/embedded`; backfill active jobs

### Sprint M4 — Matching engine (1–2 wk)

- [ ] Stage 0 SQL (hard-exclude minimal; soft signals down-rank in Stage 1)
- [ ] Stage 1 composite in one SQL statement: `w_sem · (1 − cosine) + w_dim · normalized(candidate_scores · job_scores)`
- [ ] Inngest `match/candidate-changed` + `match/job-changed` (batched, concurrency-capped)
- [ ] Upsert top-K into `matches` with breakdown/version/timestamp
- [ ] **Stage 2a: template `light_reason` for upserted top-N in the same function** — top 2 contributing dimensions from `score_breakdown` + concrete overlapping skill terms from the S4 keyword pass (persist top-K overlap terms in `score_breakdown` for this). No LLM call. Template variety to avoid stamped-out phrasing
- [ ] Keep S4 keyword-overlap computation as a Stage 1 input _and_ the 2a noun source — it doesn't retire when embeddings land
- [ ] UI reads `matches` only

**Exit:** every surfaced match carries a score + one-line reason with zero candidate action.

### Sprint M5 — Deep Dive product (1–2 wk) — _redefined in v3_

- [ ] "Deep Dive" CTA on match card / role detail → checks today's quota (count query) → inserts `match_deep_dives` row at `requested` → Inngest `generate-deep-dive`
- [ ] Generation: Claude with full context — `parsed_json`, `match_blob`s, `score_breakdown`, `culture_axes`, JD, `employers.company_profile`. **Web search behind a flag, off by default** (latency + cost; Lauren's employer notes likely beat it for Tier 3)
- [ ] Output structure (jsonb): fit summary, gap analysis, **company values & culture fit**, interview angle, resume-emphasis suggestions
- [ ] Async UX via existing realtime-notification pattern (requested → generating → complete); stale-`generating` watchdog like resume parsing
- [ ] Cache semantics: re-view reads cached row free; resume supersession allows regeneration (new `resume_id` = new cache key); old dives kept for history
- [ ] Quota: Plan-based daily limits (config map, numbers = Lauren decision); free-tier teaser allowance; **quota-exhausted state is an upgrade nudge** (consistent with paywall-moments model)
- [ ] PostHog: dive requested / generated / viewed / quota-hit / upgrade-from-quota-nudge; interest-expressed-after-dive (the conversion metric)
- [ ] Eval harness for Deep Dive quality (existing fixtures-loader pattern) — this is the product's moment of truth
- [ ] Admin: Lauren sees dives per candidate/job (signal for who's serious about which roles — free intent data)

**Exit:** candidate requests a dive, gets a rich artifact in <60s, re-views free; quota gates by Plan; Lauren sees demand signal per role.

---

## Cross-cutting

- **Cost shape (v3.1):** embeddings ~free (own hardware); 2a free (no LLM); 2b priced by demand and capped by quota — worst case = (daily cap × paid candidates × Claude call), a number you control with config.
- **Deep Dive is also intent data.** A candidate burning quota on a role is the strongest interest signal before "express interest" — surface it to Lauren.
- **Self-hosted endpoint = owned failure mode.** Inngest retries + watchdog; hosted fallback one env change away.
- **Re-embed triggers:** resume supersession, job copy edit, `EMBEDDING_VERSION` bump. Never status-only.

## Open decisions (remaining)

1. **Model lock (M0)** — before M1 ships halfvec(768).
2. **Seniority vocabulary** — audit live `resumes.seniority_level` values, then fix the shared enum.
3. **Stage 1 weights** — start 60/40 semantic-heavy; tune on first real cohort with Lauren.
4. **Deep Dive quotas per Plan + free teaser** — Lauren pricing decision (e.g. free: 1/month teaser, plan_1/2: 2/day, plan_3: 5/day — placeholders, not recommendations). Add to the Lauren decision session.
5. ~~2a mechanism~~ — **resolved: template from Stage 1 output.** Embeddings can't explain themselves (cosine is just a number), so specificity comes from keyword terms + dimension scores. Haiku rephrase stays available as a drop-in if real output reads robotic — review with Lauren/Whitney on first cohort.
6. **Web search in Deep Dive** — flag-gated; turn on only if employer-notes-based dives feel thin.
7. **Timing** — M0+M1 cheap to pull forward; M4 needs S4 admin CRUD; M5 benefits from S5 assessments (culture_axes) but can ship degraded without.

## What does not change

- S4 keyword matching ships as planned; this slots underneath.
- `candidate_scores` / `job_scores` reused unchanged (live-verified).
- `matches` is the single materialization target; UI never computes on load.
- Inngest only async system; Supabase stays auth/RLS/realtime home.
