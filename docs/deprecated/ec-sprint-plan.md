# Empowered Careers — Sprint Plan

> Last updated: May 2026
> Status: Working document

---

## Guiding Rule
Build the funnel before the features. A candidate who can't sign up, upload, and see value in 5 minutes is a lost candidate.

---

## Phase 1 Gates
All four must be green before Phase 2 build begins:

| Gate | Status | Sprint That Enables It |
|---|---|---|
| 100 free candidates in pool | ⬜ | Sprint 1 + Lauren's content |
| 30 paid candidates | ⬜ | Sprint 2 |
| 3–5 employer/agency relationships | ⬜ | Lauren owns — no sprint needed |
| 10–15 exclusive roles/month | ⬜ | Sprint 3 |

---

## Sprint 0 — Foundation ✅ Complete

- Next.js + Supabase + Vercel ✅
- Auth (Google + LinkedIn OAuth) ✅
- Resume upload + storage ✅
- Basic dashboard ✅
- Resume parsing 🚧 (in progress)

---

## Sprint 1 — First Impression
**Goal:** A new candidate can sign up, upload resume, and immediately see value.

- [ ] Resume upload mandatory before dashboard (gate it)
- [ ] ATS score calculation + display card
- [ ] Dashboard — profile completeness score
- [ ] Job board shell — all 3 tiers visible with correct lock states
- [ ] Tier 1 jobs — Lauren manually adds 10–15 curated public roles
- [ ] Trust factors on marketing page (role count, Lauren bio, placement stats)
- [ ] Basic nudge cards (ATS score low → resume review CTA)

**Exit criteria:** A real candidate can sign up, upload resume, see their ATS score, and understand what they're working toward.

---

## Sprint 2 — Paywall + Revenue
**Goal:** First dollar in.

- [ ] Stripe integration
- [ ] Subscription products (monthly + annual)
- [ ] À la carte products (resume review, LinkedIn audit, interview prep, coaching)
- [ ] Tier 3 lock/unlock logic tied to payment
- [ ] Payment confirmation + access grant flow
- [ ] Subscription management (cancel, view plan)
- [ ] Nudge: Tier 3 viewed → subscription prompt

**Exit criteria:** A candidate can pay and unlock Tier 3. Lauren gets notified.

---

## Sprint 3 — Job Board Complete
**Goal:** Lauren can operate the job board independently.

- [ ] Admin dashboard — add/edit/remove jobs
- [ ] Job tier assignment (Lauren sets manually)
- [ ] Tier 2 unlock logic (tied to assessment completion)
- [ ] Match score per role (basic — resume keyword overlap for now)
- [ ] Match reasoning (AI-generated, simple)
- [ ] Express interest / apply CTA per role
- [ ] Candidate pool view for Lauren (filter by score, role type)

**Exit criteria:** Lauren can add exclusive roles, candidates can see matches, express interest.

---

## Sprint 4 — Assessments
**Goal:** Profile depth that improves matches and drives upsells.

- [ ] Assessment framework — 5 core assessments:
  - Role Clarity
  - Values + Environment
  - Strengths
  - Leadership Style
  - Big Wins
- [ ] Results displayed as profile cards
- [ ] Match score improves visibly as assessments complete
- [ ] Tier 2 unlock tied to completing 2–3 assessments
- [ ] Coaching upsell embedded in each result

**Exit criteria:** Candidate completes assessments, sees better matches, gets nudged toward paid services.

---

## Sprint 5 — LinkedIn Grade + Full Nudge System
**Goal:** Second lead magnet live + conversion nudges firing across all touchpoints.

- [ ] LinkedIn grade (visibility score, keyword gaps)
- [ ] LinkedIn grade display card on dashboard
- [ ] Free optimization tips
- [ ] Full nudge system wired up:
  - Low ATS → resume review
  - Low LinkedIn grade → audit upsell
  - Incomplete assessments → match quality nudge
  - Tier 3 viewed → subscription prompt
  - Post Tier 2 application → interview prep upsell
  - 7 days inactive → email trigger
- [ ] Resume staleness tracking + nudge (60+ days)

**Exit criteria:** Every candidate has a clear, personalized reason to take the next action at every stage.

---

## Sprint 6 — Loops Email Automation
**Goal:** Candidate lifecycle runs on autopilot.

- [ ] Loops account + domain configured
- [ ] Supabase → Loops event pipeline (signup, resume upload, payment, assessment complete)
- [ ] Email sequences built:
  - Welcome (on signup)
  - Resume nudge (no resume after 24hrs)
  - Profile completion nudge (no assessments after 48hrs)
  - New match alert (Lauren adds roles)
  - Upsell — resume review (ATS below 70)
  - Upsell — interview prep (applied to Tier 2)
  - Weekly digest (Monday — new exclusive roles)
  - Inactive re-engagement (7 days, 30 days)

**Exit criteria:** Lauren doesn't manually chase any candidate. Sequences fire based on behavior.

---

## Tool Decisions

| Tool | Use Case | When |
|---|---|---|
| Loops | Candidate lifecycle emails | Sprint 6 |
| Google Sheets | Agency + employer tracking | Phase 1 |
| Pipedrive | Agency + employer CRM | After 10 agencies onboarded |
| Stripe | Payments + subscriptions | Sprint 2 |
| PostHog | Analytics | Sprint 1 onwards |

---

## Phase 2 — After Gates Are Hit

| Sprint | Focus |
|---|---|
| P2-S1 | Full matching algorithm (candidate score × job score) |
| P2-S2 | Agency portal — role submission + commission tracking |
| P2-S3 | AI resume rewriting + LinkedIn optimization tools |
| P2-S4 | Conversational AI assessments |
| P2-S5 | Referral system |
| P2-S6 | Pipedrive CRM integration |

---

## Rough Timeline

| Sprint | Estimated Duration |
|---|---|
| Sprint 1 | 1–2 weeks |
| Sprint 2 | 1 week |
| Sprint 3 | 1–2 weeks |
| Sprint 4 | 2 weeks |
| Sprint 5 | 1 week |
| Sprint 6 | 1 week |
| **Total** | **7–9 weeks** |
