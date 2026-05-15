# Empowered Careers — Development Plan v2

> Last updated: 2026-05-15
> Supersedes: `deprecated/ec-sprint-plan.md` (kept for historical reference)
> Source: alignment review in `C:\Users\pooja\.claude\plans\swift-sniffing-moon.md`

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

| Gate | Target | Sprint that enables |
|---|---|---|
| Free candidates in pool | 100 | Sprint 1 + content |
| Paid candidates | 30 | Sprint 2 |
| Employer/agency relationships | 3–5 | Lauren owns — no sprint |
| Exclusive roles added per month | 10–15 | Sprint 3 |

---

## Epics

| ID | Epic | Why it exists | Status |
|---|---|---|---|
| E1 | Foundations & Schema Realign | Land Plan/Job-Tier split, applicant pipeline tables, placements, referrals, coaching schema. Doc rewrite. | Not started |
| E2 | Candidate Activation | Resume gate, ATS score, profile completeness, marketing trust, basic nudges. | Sprint 0 partial |
| E3 | Paywall & Plans | Stripe, four-Plan model, à la carte products, Plan-based gating. | Not started |
| E4 | Job Board & Matching v1 | Admin job CRUD, Job Tier assignment, lightweight match score, "why this matches you" reasoning. | Not started |
| E5 | Assessments | 5 core assessments, dimension scoring, Job Tier 2 unlock. | Not started |
| E6 | Applicant Pipeline & Placements | Applications table, Lauren's pipeline view, placements + referrals first-class, marketing placement count wired to real data. | Not started |
| E7 | Coaching Delivery Surface | Hybrid model: external hosting + EC-tracked enrollments, Cal.com booking embed, "My coaching" dashboard. | Not started |
| E8 | Lifecycle Automation | Full nudge system + Loops event pipeline + sequences. | Not started |
| E9 | Phase 2 Prep | Employer/agency portal spec, commission tracking schema groundwork. | Not started |

E1–E8 are Phase 1. E9 straddles into Phase 2.

---

## Sprints

Sprint length: 1–2 weeks. Total Phase 1 estimate: 10–12 weeks (was 7–9; +2–3 weeks for E6 + E7).

### Sprint 0 — Foundation (✅ complete)
- Next.js + Supabase + Vercel
- Auth (Google + LinkedIn OAuth)
- Resume upload + storage
- Basic dashboard
- Resume parsing (in progress — finish in S1)

---

### Sprint 1 — E1: Schema Realign + Doc Rewrite (1 week)
**Why first:** every later sprint depends on the Plan/Job-Tier rename. Doing this after S2 means rewriting paywall logic twice.

- [ ] Migration: split `subscription_tier` → `plan` (`free`, `plan_1`, `plan_2`, `plan_3`) + `billing_cadence` (`one_time`, `monthly`, `annual`)
- [ ] Migration: rename job exclusivity field to `job_tier` enum on `jobs`
- [ ] Migration: trim `candidate_scores` to 5 dimensions matching the 5 Phase 1 assessments (`role_clarity_score`, `values_score`, `strengths_score`, `leadership_score`, `impact_score`, `overall_score`)
- [ ] Migration: add `applications`, `placements`, `referrals` tables (schema only — no UI yet)
- [ ] Migration: add `coaching_products`, `enrollments`, `coaching_sessions` tables (schema only)
- [ ] Migration: add `commissions` table; add `commission_rate`, `relationship_type` data capture on `employers`
- [ ] `npm run supabase:types` regenerate types
- [ ] Update all six docs in `docs/` for Plan vs. Job Tier vocabulary
- [ ] Update `CLAUDE.md` schema section

**Exit:** types compile, docs grep-clean for ambiguous "Tier 1/2/3" references, no UI regressions.

---

### Sprint 2 — E2: First Impression (1–2 weeks)
**Goal:** new candidate can sign up, upload resume, immediately see value.

- [ ] Resume upload mandatory before dashboard (gate it)
- [ ] Finish resume parsing (carryover from S0)
- [ ] ATS score calculation + display card
- [ ] Dashboard — profile completeness score (0–100)
- [ ] Job board shell — all three Job Tiers visible with correct lock states (locks driven by Plan, not by hardcoded rules)
- [ ] Tier 1 jobs — Lauren manually adds 10–15 curated public roles (budget her time OR plan a Sprint 2.5 importer)
- [ ] Trust factors on marketing page (placement count reads from `placements` table — zero is fine for now)
- [ ] Basic nudge cards (ATS low → resume review CTA)

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

- [ ] Admin: add/edit/remove/archive jobs
- [ ] Admin: assign `job_tier`, fill date, status
- [ ] Match score v1 (resume keyword overlap + Plan visibility filter)
- [ ] Match reasoning (AI-generated, single sentence — Claude API)
- [ ] Express interest CTA → writes to `applications` table at `interested` status
- [ ] Candidate pool view for Lauren (filter by Plan, completeness, role type)

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

- [ ] Application status enum: `interested`, `submitted`, `screening`, `interviewing`, `offer`, `placed`, `rejected`, `withdrawn`
- [ ] Application history audit trail (status_changes table or jsonb log)
- [ ] Lauren's pipeline view: kanban or table grouped by status, per-job and per-candidate filters
- [ ] Internal notes on applications
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

| Sprint | Focus | Duration |
|---|---|---|
| S0 | Foundation (done) | — |
| S1 | Schema realign + doc rewrite | 1 wk |
| S2 | First impression | 1–2 wk |
| S3 | Paywall & Plans | 1 wk |
| S4 | Job board & matching v1 | 1–2 wk |
| S5 | Assessments | 2 wk |
| S6 | Applicant pipeline & placements | 1–2 wk |
| S7 | Coaching delivery | 1–2 wk |
| S8 | Nudges + lifecycle | 1–2 wk |
| **Phase 1 total** | | **10–14 wk** |

---

## Cross-cutting concerns

- **Analytics:** PostHog instrumented from S2 onwards. Every nudge CTA, every Plan upgrade, every application status change emits an event.
- **RLS:** every new table gets RLS policies in the same migration that creates the table. No "we'll add policies later."
- **Lauren's admin UI:** grows incrementally — S4 (jobs + candidates), S6 (pipeline), S7 (enrollments + sessions). Don't try to design it all upfront.
- **Tier 1 job sourcing:** Lauren commits ~3 hrs/week to manual curation OR we add a lightweight RSS/Greenhouse importer in S2.5. Decide at start of S2.
- **Testing:** no automated test infrastructure today. Worth adding Playwright smoke tests against the activation flow (signup → upload → ATS score visible) by S3 — regressions there cost more than the test investment.
