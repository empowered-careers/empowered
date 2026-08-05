# Empowered Careers — Coaching/Content Pivot: Engineering Brief

> For: Claude Code
> From: GT
> Context: Full pivot from job-board-first to coaching/content-first model. ICP unchanged (mid-to-senior tech professionals). Revenue is à la carte only — no subscriptions. Money generator is 1:1 coaching; courses/content are the qualification and warming layer that feeds it. Job board is deferred, not deleted — code stays dormant until the resume/candidate list reaches critical mass.
> Supersedes the sprint order in `ec-sprint-plan.md` (last reconciled 2026-07-31). That doc's "Already shipped" section is still accurate — this brief re-sequences everything after it.

---

## 0. Read this first

Nothing in "Already shipped" is wrong or being ripped out. Auth, onboarding, resume pipeline, LinkedIn pipeline, Blueprint assessment, Stripe (code-complete), Loops, notifications, nudges v1, admin console — all of it carries over as-is and is the floor we build on. The pivot changes **what the product surfaces to candidates and what we build next**, not the intake spine.

Three operating rules for this pass:

1. **Dormant ≠ deleted.** Job board, matching, employer portal, placements/commissions: keep the schema, the routes, the admin surfaces. Just stop surfacing them to candidates and stop building on top of them. Pivot-back insurance.
2. **No subscriptions.** Anywhere you see `profiles.plan`, `plan_2`/`plan_3`, `comparePlans()`, `canSeeJobTier` — that logic is frozen, not extended. New entitlements route through `enrollments` (à la carte only), same as the existing coaching-product purchase path already does.
3. **Intake stays mandatory.** Resume upload hard-gate before dashboard access stays exactly as-is even with no job board behind it — it's how the candidate list gets built, which is the whole point of this pivot.

---

## 1. Strip job-board/plan surfaces from candidate UI (do first, small, unblocks everything else)

Goal: a candidate signing up today sees a coaching/content product, not a half-broken job board.

- [ ] Remove job board nav entry / links from candidate-facing layout. Do **not** delete `/job-board`, `/job-board/[id]`, `/job-board/saved` routes — just unlink them from nav.
- [ ] `/pricing` — remove `PlanCard` / Core / Pro subscription tiers entirely from the page. Replace with the coaching/course catalog (see §3).
- [ ] Remove `tier-locked-banner.tsx` usage from any remaining candidate surface (job board pages can keep it since they're unlinked, but nothing else should reference it).
- [ ] Audit `canSeeJobTier` call sites — confirm none are reachable from linked candidate nav. Leave the function intact.
- [ ] Dashboard: remove any "upgrade to Core/Pro" nudge copy; these get replaced in §6 with course/coaching nudges.
- [ ] Confirm `profiles.plan` writes still happen correctly on the Stripe webhook (unchanged) — we're hiding UI, not touching the payment code path.

**Exit:** a fresh signup never encounters the words "Core," "Pro," or "job board" anywhere in the product.

---

## 2. Schema changes — coaching entitlement model

New/changed tables. Write as a single migration, verify against live schema first (per house rule: schema drift from docs is common — check `information_schema.columns` via Supabase MCP before writing DDL).

```sql
-- coaches: the bench (Whitney + Lauren today, external coaches later)
create table coaches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text,
  specialty text[],           -- e.g. {'resume','interview','negotiation'}
  avatar_url text,
  cal_link text,              -- per-coach Cal.com booking link
  is_mentor boolean default false,  -- true only for graduate-sourced mentors (see §7)
  active boolean default true,
  created_at timestamptz default now()
);

-- coaching_products: add kind + coach_id
alter table coaching_products
  add column kind text check (kind in ('course','session','service','bundle')) not null default 'service',
  add column coach_id uuid references coaches(id);

-- jds: candidate-uploaded job descriptions for the ATS checker (§4)
create table jds (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) not null,
  raw_text text,
  file_path text,
  parsed_json jsonb,
  ats_score int,
  gap_summary text,
  source text check (source in ('free','paid')) not null default 'free',
  created_at timestamptz default now()
);
```

RLS: owner-only read/write on `jds` (mirrors `resumes` pattern). `coaches` — public read (active=true), admin write. `coaching_products` — no RLS change needed, just new columns.

- [ ] Write migration, run `get_advisors` (security) after applying — confirm no missing RLS on `jds`.
- [ ] Backfill `kind` on existing `coaching_products` rows (Lauren to classify current catalog: course vs session vs service).

---

## 3. Stripe catalog re-cut (ops, but code needs to support it)

À la carte only — this is the simplest part of the existing Stripe build, already code-complete for this exact path (`handleCheckoutCompleted` → `payments` + `enrollments`, no plan change).

- [ ] Confirm bundle support: does a bundle product need to grant multiple `enrollments` rows on one purchase? If yes, extend `handleCheckoutCompleted` to fan out — one Stripe line item, N enrollment rows, driven by a `bundle_contents` join or a `product_ids` array column on the bundle's `coaching_products` row. **Decide with GT/Lauren before building** — flag as open question, don't guess.
- [ ] `/pricing` (rebuilt per §1) renders `coaching_products` grouped by `kind`, filtered `active=true`, showing `coach_id` → coach card (name/photo/bio) when `kind='session'`.
- [ ] Content/course pages gate on `enrollments` (query: does this profile have an enrollment row for this product?). No plan check anywhere in this path.

**Exit:** Lauren can populate the Stripe Dashboard catalog and every purchase path (course, session, service, bundle) resolves to the correct `enrollments` row(s).

---

## 4. JD → ATS checker (new feature, dual free/paid)

This reuses the matching/scoring approach originally scoped for Sprint C (job-board matching) but candidate-initiated instead of inventory-driven — no job board dependency.

- [ ] Upload flow: candidate pastes or uploads a JD (PDF/docx/text) → `jds` row created, `source` set by which surface it came from.
- [ ] Inngest fn `parse-jd`: Claude call — parse JD into structured requirements, score against the candidate's current `parsed_json` (resume) + `candidate_scores` (Blueprint dims where relevant) → `ats_score` + `gap_summary` (short, human-readable "why this scored the way it did").
- [ ] **Free tier:** capped at N/month (Lauren to set the number — 5–10 suggested as a starting point, not a final decision). Enforce via count query on `jds` where `source='free'` and `created_at` in current month.
- [ ] **Paid tier:** unlimited, bundled with or upsold alongside a "close the gap" coaching session (`coaching_products` row with `kind='session'`).
- [ ] Surface `ats_score` + `gap_summary` on a result card; CTA to the matching course/coach based on gap content (feeds §6 prescription logic).
- [ ] Side benefit, no extra build: the `jds` table itself is market intel — which roles/companies candidates are chasing. Flag this for Lauren/John, no code needed beyond storing it well (keep `raw_text` and `parsed_json` queryable).

**Exit:** candidate can upload a JD, get an ATS score + gap summary, capped free / unlimited paid, feeding straight into a course or coach recommendation.

---

## 5. Coaching delivery surface (highest priority — this is now the core product)

Product/enrollment CRUD already exists; there is no candidate-facing consumption surface. Two `TODO(coaching)` stubs already mark where this plugs in.

- [ ] Cal.com: **D2 open decision — resolve before starting.** Once resolved, per-coach Cal.com links live on `coaches.cal_link`. Booking embed on the coach/product page → Cal.com webhook writes `coaching_sessions`.
- [ ] Candidate **"My Coaching"** dashboard card + full enrollment list page (courses + sessions, progress where applicable).
- [ ] Wire the two existing stubs: `resume-client.tsx:411`, `linkedin-client.tsx:280`.
- [ ] Course content host: **decide build-in-house vs external (Kajabi/Teachable) — same D2 decision.** Given courses are a funnel layer feeding coaching (not the primary product), lean toward simple in-house delivery (video via Mux or unlisted embed + `enrollments.progress` tracked manually) unless Lauren/Whitney already have Kajabi content ready to port.
- [ ] Admin: extend existing coaching view with per-candidate enrollment + session list (admin console already has the shell).
- [ ] Nudge: enrollment unstarted > 7 days → re-engagement (Loops, see §6).

**Exit:** a candidate who buys a course can watch it and track progress; a candidate who books a coach can see the booking and the coach can see the candidate's resume score + Blueprint dims + parsed history before the session starts.

---

## 6. Lifecycle nudges + gap-to-product prescription engine

The nudge engine (`computeNudges()`, `src/lib/dashboard/nudges.ts`) and Loops event pipeline (`src/lib/loops/client.ts`) already exist and retarget almost verbatim from job-board upsells to coaching/course upsells.

- [ ] Retarget existing rules: `nudge-resume-score` (resume_score < 70) → CTA now points at resume course/service, not `/resume` alone.
- [ ] **New — gap-to-product prescription engine** (the genuinely new logic, doesn't exist yet): given a candidate's `candidate_scores` (Blueprint dims), `resume_score`, and any `jds.gap_summary`, map to a specific recommended `coaching_products` row. Start as a rules table (dimension X low → product Y), not an LLM call — matches the "ranking-and-explanation problem, not retrieval" principle already established for matching. Promote to LLM-assisted only if rules prove insufficient.
- [ ] Loops events still missing (per `ec-sprint-plan.md` §Sprint F) — add wrappers + fire: `signup`, `resume_uploaded`, `inactive_7d`, `inactive_30d`. Drop `job_interest` / `application_status_changed` / `placed` from the active list (job-board-dependent, dormant) — but don't delete the wrapper code, just don't call it from anywhere live.
- [ ] Add new events for this pivot: `course_purchased`, `session_booked`, `enrollment_completed` → triggers the "book the related coach" nudge (course completed → coach booking CTA — this is the single highest-value nudge in the new model).
- [ ] Inactive 7d/30d detection cron (Inngest scheduled fn) — still not built, now more important since there's no job-board digest to keep people coming back.

**Exit:** every candidate has a personalized next action driven by their actual scores/gaps, and course completion reliably triggers a coaching upsell.

---

## 7. Explicitly deferred — do not build yet, but don't block later

- **Mentor pipeline.** Mentors are _not_ externally recruited — they're selected from successful paying graduates and invited back as paid mentors. No UI/workflow needed now. The only thing that matters today: `coaches.is_mentor` boolean exists in the schema (§2) so this doesn't require a backfill migration later. Selection/invitation stays manual (admin does it by hand) until there's a graduate cohort to source from.
- **B2B / agency outreach ("cherry on the cake").** Zero new build — employer portal, placements, commissions are already shipped and stay exactly as-is, just used manually by Lauren/John: filter the _paid_ candidate pool in the existing admin console, reach out by hand when a role fits. Do not build any automated matching or notification for this path. Do not market it as a promised feature — it's a surprise perk, not a commitment.
- **Content hub / blog (MDX).** D3 decision (MDX-in-repo vs external CMS) needs resolving, but this is sequenced after coaching delivery (§5) — SEO matters, but an unbuildable coaching product matters more.
- **Public lead-magnet funnel** (anonymous Blueprint-lite / free resume score feeding `leads`). Real and valuable, but sequenced after the paid product actually works — no point warming a funnel into a coaching flow that isn't ready to receive it.
- **Rev-share tracking for coaches.** Hardcode splits in a spreadsheet until coach #3. Do not build a payout/commission system prematurely.

---

## 8. Revised build order

```
1' — Strip job-board/plan UI (§1)                — small, do first
2' — Schema: coaches, coaching_products.kind/coach_id, jds (§2)
3' — Stripe catalog re-cut, à la carte only (§3)
5' — Coaching delivery: booking, My Coaching, wire TODO stubs (§5)  ← the core product now
4' — JD → ATS checker, free capped / paid unlimited (§4)
6' — Lifecycle nudges + gap-to-product prescription engine (§6)
    — deferred: content hub (D3), public lead magnet, mentor pipeline UI, B2B automation
```

Note the reorder vs the original sprint plan: coaching delivery (old Sprint E, previously blocked behind matching) now jumps ahead of the ATS checker, because a purchasable-but-unconsumable coaching session is worse than a slightly-delayed ATS feature.

---

## 9. Open decisions blocking specific sprints — resolve with GT/Lauren before starting

| #   | Decision                                                                                        | Blocks       |
| --- | ----------------------------------------------------------------------------------------------- | ------------ |
| D2  | Coaching content host (build in-house vs Kajabi/Teachable) + Cal.com account                    | §5           |
| —   | Bundle purchase → multi-enrollment fan-out logic                                                | §3           |
| —   | Free ATS-checker monthly cap (number)                                                           | §4           |
| D3  | Content engine: MDX-in-repo vs external CMS                                                     | deferred, §7 |
| —   | Paid catalog naming — must read as distinct from Career Symmetry / empoweredcareers.com modules | §3           |

Do not guess on any of these — surface them and wait rather than building against an assumption.

---

## 10. Definition of done for this pivot

A candidate can: sign up → upload resume → complete Blueprint → see a personalized gap → get recommended a specific course or coach → pay à la carte via Stripe → consume the course or book the coach → have that coach walk in already briefed on their resume score, Blueprint dimensions, and parsed history. No job board, no subscription tier, anywhere in that path.
