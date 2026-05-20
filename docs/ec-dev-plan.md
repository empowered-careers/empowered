# Empowered Careers — Development Plan v2

> Last updated: 2026-05-20
> Supersedes: `deprecated/ec-sprint-plan.md` (kept for historical reference)
> Source: alignment review in `C:\Users\pooja\.claude\plans\swift-sniffing-moon.md`

---

## Progress snapshot (2026-05-20)

What's actually landed on `main`:

**S0 + S1 shipped (foundation + schema)**

- Phase 1 core schema migration (`20260513000000_phase1_core_tables.sql`) — all 11 core tables created with RLS.
- OAuth identity hardening — `linkedin_provider_id` + `google_provider_id` on profiles; OIDC `iss`/`sub` fallback in the auth trigger; `handle_auth_user_updated()` keeps providers in sync.
- Async job infrastructure — `status` enum + `parse_started_at`/`parse_error` on `resumes`, `sync_started_at`/`sync_error` on `linkedin_profiles`. Realtime publication + `REPLICA IDENTITY FULL` on both.
- LinkedIn exports storage bucket — 5 MiB PDF-only with per-user folder RLS.
- S1 schema realign + LLM metadata migrations (`20260516120000_s1_schema_realign.sql`, `20260516130000_resume_llm_metadata.sql`, `20260517000000_linkedin_llm_metadata.sql`).
- LinkedIn identity sync at OAuth callback — non-blocking; writes `linkedin_profiles` with `status='idle'`.
- Async job realtime pattern fully wired: `useResumeNotifications` + `useLinkedinNotifications` hooks, mounted via `src/components/providers/realtime-notifications.tsx` in the root layout.
- App-shell scaffold + `(app)/` route group: `dashboard` (wired), `resume`, `linkedin`, `content`, `job-board`, `pipeline`.
- Design system locked (`docs/design.md`).
- Service-role Supabase client (`src/lib/supabase/service.ts`).

**S2 in-flight — resume + LinkedIn pipelines end-to-end ✅**

- **Background-job orchestrator switched from raw API routes to Inngest.** `/api/parse-resume` and `/api/sync-linkedin` are deleted; `src/inngest/functions/parse-resume.ts` and `parse-linkedin.ts` are the canonical workers, registered via `/api/inngest`. Concurrency capped at 5.
- **PDF extraction approach changed.** `src/lib/pdf-extract.ts` is gone — instead, Anthropic Claude consumes the PDF directly (`src/lib/llm/anthropic.ts` + `parse-resume.ts` / `parse-linkedin.ts`). No `unpdf` / `pdf-parse` dependency.
- LLM pipeline: `src/lib/llm/` holds `parse-resume`, `parse-linkedin`, `score-resume`, `score-linkedin`, shared `prompts.ts` + `schemas.ts`. Prompt versions in env (`RESUME_PROMPT_VERSION`, `LINKEDIN_PROMPT_VERSION`).
- Resume flow: upload → file-hash dedup (`src/lib/file-hash.ts`) → Inngest `parse-resume` (extract → score → write `parsed_json`, `ats_score`, `summary`). Supersession handled — prior resume gets `is_current=false`, `superseded_at` stamped. Retry-from-failed UX in `resume-client.tsx`.
- LinkedIn flow: upload PDF to `linkedin-exports` → Inngest `parse-linkedin` (extract → score → write `parsed_json`, `profile_score`, `summary`). **OAuth fields (`linkedin_url`, `headline`, `raw_json`) are explicitly untouched** by the PDF parser. Works for users who supplied `linkedin_url` via dialog without LinkedIn OAuth (action upserts from `profiles.linkedin_url`). Auth-helper now requests `r_profile_basicinfo` scope on the `linkedin_oidc` provider.
- Dedicated route pages: `(app)/resume/page.tsx` + `resume-client.tsx`, `(app)/linkedin/page.tsx` + `linkedin-client.tsx`. Sidebar entries updated.
- Profile Strength card surfaces LinkedIn upload section when `profiles.linkedin_url` is set.
- Evals harness built: `evals/parser`, `evals/scorer`, `evals/linkedin-parser`, `evals/linkedin-scorer` with shared fixtures-loader + report util. Scripts in `package.json`. Fixtures + ground truth + rubric pairs still need to be populated.

**S2 closeout (2026-05-20) — admin substrate + job board + pipeline shipped**

- Phase 0 #0 — Role enum migration (`20260520000000_role_enum.sql`): `profiles.role` (`candidate`/`admin`/`employer`), `employer_id` FK, `internal_notes`, plus `is_admin()` / `is_employer()` / `current_employer_id()` SECURITY DEFINER helpers. Authoritative source: `docs/done/ec-admin-super-plan.md`.
- Phase 0 #1 — Admin shell (`src/app/admin/layout.tsx`, `admin-sidebar.tsx`, empty `/admin` overview). Server-side role guard; sidebar groups routes by sprint slice so S4/S6/S7 deliverables slot in.
- S2 #2 — Job Board Plan A (`docs/done/ec-job-board-plan.md`): `jobs` RLS rewrite + `can_see_job_tier(plan, job_tier)` + system employer seed + `saved_jobs` table. `/job-board` real-data board with filters + tier-locked banners; `/job-board/[id]` detail with plan gating; `/job-board/saved`; `/admin/jobs` list + create + `[id]/edit`. `src/lib/plan.ts` mirrors the SQL helper client-side.
- S2 #3 — Candidate Pipeline Plan B (`docs/done/ec-candidate-pipeline-plan.md`): `applications` candidate-facing RLS (read self, insert at `interested`, self-update only to `withdrawn`) + realtime publication. `expressInterest` / `withdrawApplication` server actions. Express Interest CTA with PII consent modal on `JobCard` + `/job-board/[id]`. `/pipeline` kanban (8 columns matching `application_status`), per-card withdraw, `useApplicationNotifications` realtime hook mounted in `RealtimeNotifications`.

S4/S6 partial credit landed via the pipeline plan: `applications` writes, express-interest CTA, candidate-side kanban. Lauren still updates non-interested statuses via Supabase Studio until `/admin/applications` ships in S6.

**Open S2 work** — see `docs/todo.md` for live checklist. Still TODO:

- `ANTHROPIC_API_KEY` into `.env.local` (blocker for local smoke test).
- End-to-end smoke test of resume + LinkedIn pipelines locally.
- Production Inngest endpoint registration + prod env vars (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`).
- Resume-upload gate before dashboard.
- Profile completeness calculation (`completeness-ring.tsx` shell exists).
- Promote Lauren's profile to `role='admin'` in Supabase Studio and seed Tier 1 roles via `/admin/jobs`.
- Surface LinkedIn `profile_score` badge on dashboard.
- Eval fixtures + ground truth (≥5 per harness).
- Stale-`uploading` / stale-`processing` watchdog in notification hooks.
- Loops subscription to `candidate/resume_parsed` + `candidate/linkedin_parsed` events (events already emitted).

---

## Why v2

The original sprint plan optimized for "first dollar in" but treats the platform as a candidate funnel only. The full ecosystem framing (candidates + employers/agencies + coaching + post-match placement) requires:

1. A Plan model distinct from Job Tier (G1 in the review).
2. An applicant pipeline beyond `matches.candidate_interested` (G2, G3).
3. A coaching delivery surface (G4).
4. Phase 1 data capture for the Phase 2 employer/agency portal (G5).

v2 keeps the funnel-first philosophy but reorders work so foundational schema lands before features depend on it.

---

## Guiding Rules

- **Funnel before features.** A candidate must sign up, upload, and see value in 5 minutes. Anything blocking that path is P0.
- **Schema before UI.** If a feature needs a new table, the migration ships first. No feature work on top of a schema that's about to change.
- **Manual is fine, untracked is not.** Phase 1 operations stay manual (Lauren in admin UI / Google Sheets), but every manual action writes to a real table so Phase 2 automation has data.
- **Don't ship the Plan rename twice.** G1 (Plan vs. Job Tier) touches every doc, the schema, the UI, and pricing. Land it in one coordinated sprint.

---

## Phase 1 Gates (unchanged)

All four must be green before Phase 2 work begins:

| Gate                            | Target | Sprint that enables     |
| ------------------------------- | ------ | ----------------------- |
| Free candidates in pool         | 100    | Sprint 1 + content      |
| Paid candidates                 | 30     | Sprint 2                |
| Employer/agency relationships   | 3–5    | Lauren owns — no sprint |
| Exclusive roles added per month | 10–15  | Sprint 3                |

---

## Epics

| ID  | Epic                            | Why it exists                                                                                                                 | Status           |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| E1  | Foundations & Schema Realign    | Land Plan/Job-Tier split, applicant pipeline tables, placements, referrals, coaching schema. Doc rewrite.                     | Not started      |
| E2  | Candidate Activation            | Resume gate, ATS score, profile completeness, marketing trust, basic nudges.                                                  | Sprint 0 partial |
| E3  | Paywall & Plans                 | Stripe, four-Plan model, à la carte products, Plan-based gating.                                                              | Not started      |
| E4  | Job Board & Matching v1         | Admin job CRUD, Job Tier assignment, lightweight match score, "why this matches you" reasoning.                               | Not started      |
| E5  | Assessments                     | 5 core assessments, dimension scoring, Job Tier 2 unlock.                                                                     | Not started      |
| E6  | Applicant Pipeline & Placements | Applications table, Lauren's pipeline view, placements + referrals first-class, marketing placement count wired to real data. | Not started      |
| E7  | Coaching Delivery Surface       | Hybrid model: external hosting + EC-tracked enrollments, Cal.com booking embed, "My coaching" dashboard.                      | Not started      |
| E8  | Lifecycle Automation            | Full nudge system + Loops event pipeline + sequences.                                                                         | Not started      |
| E9  | Phase 2 Prep                    | Employer/agency portal spec, commission tracking schema groundwork.                                                           | Not started      |

E1–E8 are Phase 1. E9 straddles into Phase 2.

---

## Sprints

Sprint length: 1–2 weeks. Total Phase 1 estimate: 10–12 weeks (was 7–9; +2–3 weeks for E6 + E7).

### Sprint 0 — Foundation (✅ complete)

- Next.js + Supabase + Vercel
- Auth (Google + LinkedIn OAuth) — hardened with OIDC `iss`/`sub` fallback identity sync
- Resume upload + storage
- Basic dashboard (since moved into `(app)/` route group)
- Resume parsing scaffold (route exists; PDF extractor still stubbed — carries into S2)

---

### Sprint 1 — E1: Schema Realign + Doc Rewrite (✅ complete)

**Why first:** every later sprint depends on the Plan/Job-Tier rename. Doing this after S2 means rewriting paywall logic twice.

Status as of 2026-05-15: core tables + OAuth hardening + async job columns landed; **the Plan/Job-Tier rename and the new pipeline/coaching/commissions tables have not been done yet.** The shipped schema matches the pre-v2 vocabulary.

- [x] Migration: Phase 1 core tables (employers, profiles, resumes, linkedin_profiles, assessments, assessment_responses, candidate_scores, jobs, job_scores, matches, payments) with RLS
- [x] Migration: OAuth provider id columns + hardened `handle_new_user` / `handle_auth_user_updated` triggers
- [x] Migration: async job `status` enum + realtime publication on `resumes` and `linkedin_profiles`
- [x] Migration: `linkedin-exports` storage bucket + per-user RLS
- [x] Migration: split `subscription_tier` → `plan` (`free`, `plan_1`, `plan_2`, `plan_3`) + `billing_cadence` (`one_time`, `monthly`, `annual`)
- [x] Migration: add `job_tier` enum + column on `jobs` (`tier_1`, `tier_2`, `tier_3`)
- [x] Migration: add `role_clarity_score` to `candidate_scores` — `mindset_score` and `communication_score` kept for Phase 2 (Sprint P2-5); Phase 1 code leaves them null
- [x] Migration: add `applications`, `placements`, `referrals` tables (schema only — no UI yet)
- [x] Migration: add `coaching_products`, `enrollments`, `coaching_sessions` tables (schema only)
- [x] Migration: add `commissions` table + `commission_rate` on `employers` (`relationship_type` already existed)
- [x] `database.types.ts` updated manually (run `npm run supabase:types` after next `supabase db push` to sync from remote)
- [x] Update docs in `docs/` for Plan vs. Job Tier vocabulary (`db_schema.md` rewritten)
- [x] Update `CLAUDE.md` schema section

**Exit:** types compile, docs grep-clean for ambiguous "Tier 1/2/3" references, no UI regressions.

---

### Sprint 2 — E2: First Impression (in flight)

**Goal:** new candidate can sign up, upload resume, immediately see value.

**Approach change from original plan:** PDF text extraction is no longer a separate step. Anthropic Claude consumes the uploaded PDF directly via the Files API, so `src/lib/pdf-extract.ts` and the `unpdf`/`pdf-parse` route are obsolete. Background work runs through Inngest functions, not bare API routes.

- [x] **PDF parsing pipeline live** — Anthropic direct-PDF ingestion via `src/lib/llm/parse-resume.ts` + `parse-linkedin.ts`
- [x] Resume parsing end-to-end — Inngest `parse-resume` writes `parsed_json`, `ats_score`, `summary`; dedup via file hash; supersession + retry UX
- [x] ATS score calculation + display card on dashboard
- [x] LinkedIn PDF sync end-to-end — Inngest `parse-linkedin` writes `parsed_json`, `profile_score`, `summary`; OAuth fields preserved
- [x] Evals harness scaffolded for both parser + scorer on resume and LinkedIn
- [ ] `ANTHROPIC_API_KEY` configured locally + on prod; Inngest endpoint registered in dashboard
- [ ] Resume upload mandatory before dashboard (gate it)
- [ ] Dashboard — profile completeness score (0–100); `completeness-ring.tsx` shell already exists, needs calculation logic
- [ ] Surface LinkedIn `profile_score` badge in Profile Strength card
- [x] Job board shell — all three Job Tiers visible with correct lock states (locks driven by Plan via `can_see_job_tier` + `src/lib/plan.ts`)
- [x] `/admin/jobs` CRUD so Lauren can seed Tier 1 herself (job-board plan A)
- [x] Express Interest CTA + candidate `/pipeline` kanban (pipeline plan B — pulled forward from S4/S6)
- [ ] Tier 1 jobs — Lauren manually adds 10–15 curated public roles via `/admin/jobs`
- [ ] Trust factors on marketing page (placement count reads from `placements` table — zero is fine for now)
- [ ] Basic nudge cards (ATS low → resume review CTA)
- [ ] Stale-`uploading` / stale-`processing` watchdog in `useResumeNotifications` + `useLinkedinNotifications` (covers silent `inngest.send` failures)
- [ ] Eval fixtures + ground truth populated (≥5 per harness)

**Exit:** a real candidate signs up, uploads resume, sees their ATS score, sees Job Tier 1 roles.

---

### Sprint 3 — E3: Paywall & Plans (1 week)

**Goal:** first dollar in.

- [ ] Stripe integration (customer create, webhook handlers)
- [ ] Stripe products for Plan 1 (one-time), Plan 2 (monthly + annual), Plan 3 (monthly + annual)
- [ ] À la carte products: resume review, LinkedIn audit, interview prep, individual coaching sessions
- [ ] Plan-based gating helpers (server + RLS): `has_plan(level)`, `can_see_job_tier(tier)`
- [ ] Payment confirmation flow → Plan upgrade on profile
- [ ] Subscription management UI (cancel, view plan, change cadence)
- [ ] À la carte purchase grants Plan 1 automatically
- [ ] Nudge: viewing locked Job Tier → corresponding Plan upgrade prompt

**Exit:** a candidate can pay; Plan persists; gating works end-to-end; Lauren is notified of new payments.

---

### Sprint 4 — E4: Job Board & Matching v1 (1–2 weeks)

**Goal:** Lauren operates the job board independently; candidates see matches.

Some scope already landed in S2 via the job-board + pipeline plans. Remaining S4 work is matching + Lauren's candidate pool view.

- [x] Admin: add/edit/archive jobs (landed in S2 via `docs/done/ec-job-board-plan.md`)
- [x] Admin: assign `job_tier`, status (same)
- [x] Express interest CTA → writes to `applications` table at `interested` (landed in S2 via `docs/done/ec-candidate-pipeline-plan.md`)
- [ ] Match score v1 (resume keyword overlap + Plan visibility filter)
- [ ] Match reasoning (AI-generated, single sentence — Claude API)
- [ ] Candidate pool view for Lauren — `/admin/candidates` + `/admin/payments` (admin-super slice 1, see `docs/done/ec-admin-super-plan.md`)

**Exit:** Lauren adds exclusive roles; candidates see Plan-appropriate matches; expression of interest creates a real `applications` row.

---

### Sprint 5 — E5: Assessments (2 weeks)

**Goal:** profile depth that improves matches and drives upsells.

- [ ] Assessment runner UI (multi-step form, save-resume)
- [ ] Five assessments built: Role Clarity, Values + Environment, Strengths, Leadership Style, Big Wins
- [ ] Dimension scoring writes to `candidate_scores`
- [ ] Match score visibly improves as assessments complete
- [ ] Job Tier 2 visibility unlocked at 2–3 assessments complete (Plan 2+ required for the assessments themselves)
- [ ] Coaching upsell embedded per assessment result (links to Plan 3 or à la carte)

**Exit:** candidate completes assessments, sees better matches, gets nudged toward coaching.

---

### Sprint 6 — E6: Applicant Pipeline & Placements (1–2 weeks)

**Goal:** end-to-end loop closes. Express-interest → placed is a real, tracked flow.

The candidate side of the pipeline landed in S2 via `docs/done/ec-candidate-pipeline-plan.md`. S6 owns Lauren's admin kanban + the placement flow.

- [x] Application status enum + candidate-facing kanban at `/pipeline` (landed in S2)
- [x] Application history audit trail (`applications.status_log` jsonb exists from S1; appends are admin-driven)
- [ ] Lauren's pipeline view: `/admin/applications` kanban (admin-super slice 2, see `docs/done/ec-admin-super-plan.md`)
- [ ] Internal notes on applications (admin-super slice 2)
- [ ] Mark-as-placed flow → creates `placements` row, triggers success-story email via Loops
- [ ] Marketing page placement count reads from `placements` table
- [ ] Referrals: candidate can submit a referral → writes to `referrals` table, sends invite via Loops
- [ ] Referral attribution tracked through to placement

**Exit:** Lauren can see and update every active candidate's funnel position; placement events are first-class; the flywheel is measurable.

---

### Sprint 7 — E7: Coaching Delivery Surface (1–2 weeks)

**Goal:** what's sold can actually be consumed.

- [ ] `coaching_products` catalog admin (name, description, external_url, type: module / session-pack / 1:1)
- [ ] Enrollment grant on à la carte purchase or Plan 3 activation
- [ ] Webhook ingestion endpoint for external host (Kajabi or Teachable) → updates `enrollments.progress`
- [ ] Cal.com embed for 1:1 booking → writes to `coaching_sessions`
- [ ] Dashboard "My coaching" card: active enrollments, next session, progress bars
- [ ] Nudge: enrollment unstarted after 7 days → re-engagement email
- [ ] Admin view: enrollment + session list per candidate

**Exit:** candidates who paid for coaching have a place to consume it; Lauren can see who's engaging.

---

### Sprint 8 — E8: Nudges + Lifecycle Automation (1–2 weeks)

**Goal:** Lauren stops manually chasing candidates.

- [ ] LinkedIn grade (visibility score, keyword gaps) + display card
- [ ] Resume staleness tracking + nudge (60+ days)
- [ ] Loops account + domain configured
- [ ] Supabase → Loops event pipeline:
  - `candidate.signup`, `candidate.resume_uploaded`, `candidate.payment`, `candidate.assessment_complete`, `candidate.plan_upgraded`, `candidate.job_interest`, `candidate.application_status_changed`, `candidate.placed`, `candidate.inactive_7d`, `candidate.inactive_30d`
- [ ] Email sequences:
  - Welcome, Resume nudge, Profile completion nudge, New match alert, Upsell — resume review (ATS<70), Upsell — interview prep (post-Tier 2 application), Weekly digest, Inactive re-engagement (7d/30d), Success story prompt (on `placed`)
- [ ] Full in-app nudge matrix wired (every trigger in `ec-feature-list.md` §9)

**Exit:** every candidate has a clear, personalized next action at every stage; sequences fire on behavior.

---

## Phase 2 — After Gates Hit

### Sprint P2-1 — E9: Employer/Agency Portal (2 weeks)

- Employer/agency auth + portal
- Role submission flow
- Candidate-interest view (no PII pre-match)
- Commission tracking + payout history
- Migrate Lauren's Google Sheets agency data into `employers` + `commissions`

### Sprint P2-2 — Full Matching Algorithm

- Weighted candidate-score × job-score (use `job_scores` weights table)
- Replace keyword overlap with dimension match
- A/B match reasoning quality

### Sprint P2-3 — AI Tools (Conversion Levers)

- AI resume rewrite (Claude API)
- AI LinkedIn optimization
- Conversational assessments (replaces multi-step forms)

### Sprint P2-4 — Pipedrive CRM Integration

- Migrate from Google Sheets to Pipedrive
- Sync employers, applications, placements bidirectionally

### Sprint P2-5 — Expanded Assessments

- Add Mindset/Saboteur and Communication Style assessments (the 8-9 from `context.md` original vision)
- Add `mindset_score`, `communication_score` back to `candidate_scores`

---

## Timeline

| Sprint            | Focus                           | Duration     |
| ----------------- | ------------------------------- | ------------ |
| S0                | Foundation (done)               | —            |
| S1                | Schema realign + doc rewrite    | 1 wk         |
| S2                | First impression                | 1–2 wk       |
| S3                | Paywall & Plans                 | 1 wk         |
| S4                | Job board & matching v1         | 1–2 wk       |
| S5                | Assessments                     | 2 wk         |
| S6                | Applicant pipeline & placements | 1–2 wk       |
| S7                | Coaching delivery               | 1–2 wk       |
| S8                | Nudges + lifecycle              | 1–2 wk       |
| **Phase 1 total** |                                 | **10–14 wk** |

---

## Cross-cutting concerns

- **Analytics:** PostHog instrumented from S2 onwards. Every nudge CTA, every Plan upgrade, every application status change emits an event.
- **RLS:** every new table gets RLS policies in the same migration that creates the table. No "we'll add policies later."
- **Lauren's admin UI:** grows incrementally — S4 (jobs + candidates), S6 (pipeline), S7 (enrollments + sessions). Don't try to design it all upfront.
- **Tier 1 job sourcing:** Lauren commits ~3 hrs/week to manual curation OR we add a lightweight RSS/Greenhouse importer in S2.5. Decide at start of S2.
- **Testing:** no automated test infrastructure today. Worth adding Playwright smoke tests against the activation flow (signup → upload → ATS score visible) by S3 — regressions there cost more than the test investment.
