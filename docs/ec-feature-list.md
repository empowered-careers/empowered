# Empowered Careers — Feature List

> Last updated: May 2026
> Status: Working document

---

## 1. Marketing Page

- Trust factors: active role count, placement stats, agency/employer logos, Lauren bio
- Tiered job board preview (static/demo)
- Single CTA — "Get Access"

---

## 2. Auth

- Google + LinkedIn OAuth ✅
- LinkedIn auto-populate (name, headline, role, URL) ✅

---

## 3. Onboarding Flow

- Resume upload — mandatory before dashboard access
- Progress indicator
- No skip option on resume upload

---

## 4. Resume Features

- Upload + storage ✅
- PDF/DOCX parsing ✅ (in progress)
- Resume score (0–100) with breakdown — job-agnostic LLM scoring at upload
- Resume score display card on dashboard
- Staleness tracking (last updated date, nudge after X days)
- Resume rewrite service CTA (à la carte upsell)

---

## 5. LinkedIn Features

- URL capture via OAuth ✅
- LinkedIn grade (visibility score, keyword gaps)
- LinkedIn grade display card on dashboard
- Free optimization tips (basic)
- Full LinkedIn audit CTA (paid service upsell)

---

## 6. Assessments

Five core assessments for Phase 1:

- Role Clarity — target role, level, location
- Values + Environment — culture fit signal
- Strengths — zone of genius
- Leadership Style — team and org fit
- Big Wins — proof of impact

Features:

- Progressive unlock — each improves match score visibly
- Results displayed as profile cards
- Coaching upsell embedded per result
- Tier 2 unlock tied to completing 2–3 assessments

---

## 7. Job Board

- Tier 1 — public/curated roles (visible post signup + resume upload)
- Tier 2 — semi-exclusive (unlocked by assessments)
- Tier 3 — fully exclusive (subscription only)
- Match score per role
- Match reasoning — _"Why this matches you"_
- Express interest / apply CTA per role
- New match notifications (email + in-app)

---

## 8. Dashboard

- Profile completeness score (0–100)
- Nudge cards (personalized, score and behavior based)
- Job tier preview with correct lock states
- Match count visible at all times

---

## 9. Nudge System

In-app nudge cards + email triggers:

| Trigger                 | Nudge                 |
| ----------------------- | --------------------- |
| Resume score low        | Resume review upsell  |
| LinkedIn grade low      | LinkedIn audit upsell |
| Assessment incomplete   | Match quality nudge   |
| Tier 3 viewed           | Subscription prompt   |
| 7 days inactive         | New matches email     |
| Post Tier 2 application | Interview prep upsell |
| Resume stale (60+ days) | Update resume nudge   |

---

## 10. Payments (Stripe)

- Monthly subscription — Tier 3 access
- Annual subscription — Tier 3 access (discounted)
- À la carte purchases:
  - Resume review
  - LinkedIn audit
  - Interview prep
  - Coaching sessions
- Any payment = Tier 3 unlocked
- Subscription management (cancel, view plan)

---

## 11. Admin — Lauren

- Add / edit / remove job listings
- Assign job tier manually (Tier 1 / 2 / 3)
- View and filter candidate pool (by score, completeness, role type)
- Manually flag candidates for specific roles
- View nudge and conversion performance
- Manage subscriptions and payments

---

## 12. Matching Engine (Phase 1 — Lightweight)

- Candidate score derived from resume + assessments
- Job score from role requirements (manually set by Lauren)
- Basic matching — resume keyword overlap + assessment signals
- Match reasoning generated (AI-assisted)
- Match score improves as candidate completes more profile steps

---

## 13. Email Automation (Loops)

Triggered by candidate events piped from Supabase:

| Sequence                | Trigger                                     |
| ----------------------- | ------------------------------------------- |
| Welcome                 | Signup complete                             |
| Resume nudge            | Signed up, no resume after 24hrs            |
| Profile completion      | Resume uploaded, no assessments after 48hrs |
| New match alert         | Lauren adds new Tier 2/3 role               |
| Upsell — resume         | Resume score below 70                       |
| Upsell — LinkedIn       | LinkedIn grade low                          |
| Upsell — interview prep | Applied to Tier 2 role                      |
| Weekly digest           | Every Monday — new exclusive roles          |
| Inactive re-engagement  | 7 days no login                             |
| 30-day re-engagement    | 30 days no login                            |

---

## Phase 2 Features (Deferred)

| Feature                       | Reason Deferred                        |
| ----------------------------- | -------------------------------------- |
| Full matching algorithm       | Need candidate + job volume first      |
| ~~Agency portal~~             | Shipped 2026-05-23 (Sprint P2-1)       |
| AI resume rewriting           | Conversion lever, not core             |
| Conversational AI assessments | Complexity without proven demand       |
| Public job scraping           | Manual curation sufficient for Phase 1 |
| Referral system               | Need placements first                  |
| Pipedrive CRM                 | After 10 agencies onboarded            |
| Mobile app                    | Phase 3                                |
| AI coach                      | Phase 3                                |
