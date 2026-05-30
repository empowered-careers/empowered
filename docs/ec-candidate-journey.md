# Empowered Careers — Candidate Journey

> Last updated: May 2026
> Status: Working document

---

## Core Principle

The product is one thing: **access to exclusive roles.**
Everything else — Resume score, LinkedIn grade, assessments, resume tools — are conversion levers pushing candidates toward paying for that access.

---

## Stage 1 — Discovery

- Candidate sees Lauren's LinkedIn post / newsletter / ad
- CTA: _"Get matched to roles you won't find anywhere else"_
- Lands on marketing page
- Trust factors visible before signup:
  - Active role count by category and level
  - Recent placement stories
  - Agency and employer logos
  - Lauren's credibility — 15 years, 1,000+ placements across 50+ companies
- Single CTA: **"Get Access"**

---

## Stage 2 — Sign Up

- Google or LinkedIn OAuth
- LinkedIn auto-populates: name, headline, current role, LinkedIn URL
- **Resume upload mandatory** before accessing dashboard
  - Fuels Stream 2 matching even for free users
  - Soft-forced — no skip option
- Redirected to dashboard on completion

---

## Stage 3 — Dashboard (First Visit)

Three things visible immediately:

### 1. Job Board Preview — All Three Tiers

- **Tier 1 (public/curated):** Fully visible and browsable
- **Tier 2 (semi-exclusive):** Company and level visible, role title blurred — _"Complete your profile to unlock"_
- **Tier 3 (exclusive):** Fully locked — _"X exclusive roles active this month — subscribe to access"_

### 2. Profile Completeness Card

- Score out of 100
- Each incomplete item shows exactly what it unlocks

### 3. Nudge Cards (Personalized)

Shown immediately based on what's been completed:

- Resume uploaded → Resume score runs → _"Your resume scores 54/100 — candidates with 80+ get 3x more callbacks"_
- LinkedIn connected → grade runs → _"Your LinkedIn visibility is low — recruiters may not be finding you"_
- No assessments → _"Candidates with complete profiles get matched to 2x more roles"_

---

## Stage 4 — Free Zone (Profile Building)

Each action is self-motivated — improves match quality and shows real signal to the candidate.

### Resume Upload + Resume Score (Immediate)

- Score displayed with full breakdown
- Nudge: _"Want Lauren to rewrite this? Book a resume review →"_

### LinkedIn Grade (Immediate)

- Visibility score + keyword gaps
- Free tip shown, paid service for full rewrite
- Nudge: _"Your headline isn't optimized for recruiter search →"_

### Assessments — Progressive, Not Mandatory

> **Status note:** The first assessment shipping is the **Career Identity Blueprint™** — a
> single 30-question scan that delivers the archetype / leadership-style / company-fit /
> energy cards in one run and, for Phase 1, populates all five dimensions below. It is one of
> a planned suite, not a replacement for the dimension-specific assessments. See
> [`docs/career-blueprint-integration.md`](./career-blueprint-integration.md). Note: Tier 2
> stays **plan-gated** (see `src/lib/plan.ts`); the Blueprint improves match quality and
> drives nudges rather than acting as an access gate.

| Assessment           | What Candidate Gets                   | Nudge Toward         |
| -------------------- | ------------------------------------- | -------------------- |
| Role Clarity         | Target role defined, shown on profile | Tier 2 unlock        |
| Values + Environment | Culture fit card                      | Tier 2 unlock        |
| Strengths            | Zone of genius summary                | Coaching upsell      |
| Leadership Style     | Style card + blind spots              | Coaching upsell      |
| Big Wins             | Impact statement draft                | Resume review upsell |

Each completed assessment:

- Visibly improves match score
- Unlocks more Tier 2 roles
- Triggers a specific nudge based on the result

---

## Stage 5 — Tier 2 Unlock

Completing 2–3 assessments + resume upload unlocks Tier 2.

_"You've unlocked 12 semi-exclusive roles — these aren't on LinkedIn yet."_

Tier 3 remains locked with a persistent but non-intrusive banner:
_"X exclusive roles this month. Subscribed members only."_

---

## Stage 6 — Paywall Moments (Multiple, Not One Wall)

Not a single hard gate — multiple natural conversion moments:

| Trigger                   | Nudge                                                |
| ------------------------- | ---------------------------------------------------- |
| Views Tier 3 locked roles | _"Subscribe to unlock — from $X/month"_              |
| Resume score below 70     | _"Book a resume review with Lauren"_                 |
| LinkedIn grade low        | _"Get a full LinkedIn audit"_                        |
| Completes all assessments | _"Your profile is complete — see your full matches"_ |
| 7 days inactive           | Email: _"3 new exclusive roles match your profile"_  |
| Applies to Tier 2 role    | _"Want Lauren to prep you for this interview?"_      |

Every nudge is specific, not generic — based on actual score or behavior.

---

## Stage 7 — Paid Zone

### Subscription Unlocks

- Full Tier 3 job access
- Match reasoning per role — _"Why this matches you"_
- New match alerts (email + in-app)
- Express interest / apply per role — confirming this shares the candidate's full profile (name, email, phone, LinkedIn, resume, assessment results) with the hiring company

### À La Carte Purchases

- Resume rewrite (Brand Magnification)
- LinkedIn audit + rewrite
- Interview prep (Distinguished Dialogues)
- Coaching sessions (North Star, Mindset Mastery, Career Navigator etc.)

### Upsells Within Paid Zone

- _"You matched to a VP Engineering role — want interview prep?"_
- _"Your resume hasn't been updated in 60 days — this role requires X skill you haven't highlighted"_

**Rule: Any payment = Tier 3 access unlocked.**

---

## Stage 8 — Placement + Flywheel

- Candidate placed → success story captured
- Referral CTA: _"Know a Director or VP who's looking?"_
- Testimonial feeds back to marketing page
- Lauren's placement stats update
- New candidate enters top of funnel

---

## Job Board Tier Definition

| Tier   | Source                                  | Access                   | Purpose                              |
| ------ | --------------------------------------- | ------------------------ | ------------------------------------ |
| Tier 1 | Public / curated by Lauren              | On signup                | Show immediate value, set baseline   |
| Tier 2 | Agency submitted, non-priority          | Complete 2-3 assessments | Reward engagement, prove exclusivity |
| Tier 3 | Lauren's direct clients, priority roles | Paid subscription        | The moat. Never posted publicly.     |
