# Empowered Careers — Positioning & Context

> Last updated: May 2026  
> Author: GT (Thrilok Abhishek)

---

## The One-Liner

A curated talent network for mid-to-senior tech professionals — where candidates are assessed, scored, and matched to exclusive roles that never appear on public job boards.

---

## The Problem

Senior tech roles are largely invisible. 80%+ circulate through recruiter networks and agency pipelines before ever hitting LinkedIn or Indeed. Candidates are applying blind, using generic tools (Teal, Jobscan) that optimise resumes for a system that doesn't surface the best opportunities anyway.

On the employer side: hiring managers are drowning in unvetted applicants. They trust their recruiter network because it filters for fit — not just keywords.

Nobody owns the full loop: assess → prepare → match → place.

---

## The Solution

A closed-loop platform with two revenue streams:

### Stream 1 — Candidate Revenue

Candidates pay to enter the ecosystem via:

- Paid webinars (entry point, lowest friction)
- À la carte services (resume, LinkedIn, interview prep)
- Career Symmetry coaching modules (Lauren's existing IP)

**Any payment = lifetime access to the private job board.**

Free tier exists as a lead magnet (AI-powered Resume score at upload, LinkedIn grade) — but the job board is gated. The job-vs-resume ATS Score is unlocked when a paid candidate views a specific role. If it's free on ChatGPT, it's free here. If it requires Lauren's network or judgment, it's paid.

### Stream 2 — B2B / Placement Revenue

- Direct: Lauren's existing hiring clients post exclusive roles
- Indirect: Agency partners onboarded to submit roles, earn placement commissions on hires

---

## The Flywheel

```
Free content (webinars, LinkedIn, Reddit)
        ↓
Candidate signs up → shares LinkedIn + resume
        ↓
        [PAYWALL GATE — any payment unlocks lifetime access]
        ↓
Candidate Pool (vetted, profiled, scored)
        ↓                          ↓
Coaching / content upsell     Private Job Board
(Stream 1 revenue)            (exclusive roles only)
        ↓                          ↓
              Placement
        (Stream 2 revenue)
              ↓
    Success story → new candidates sign up
              ↑_____________________________↑
```

The private job board is both the **product** and the **lead magnet** — candidates can't access these roles anywhere else.

---

## The Product Vision (Phase 2+)

### Core Flow

1. Candidate signs up → links LinkedIn → uploads resume
2. Resume + LinkedIn parsed into Supabase
3. Candidate goes through 8-9 assessments covering:
   - Mental position + mindset (saboteur identification)
   - Strengths + zone of genius
   - Values + environment fit
   - Leadership style + communication style
   - Big wins (proof of impact)
4. Candidate scored across multiple dimensions
5. Jobs (added by agencies/employers) parsed + scored on matching dimensions
6. Matching algorithm surfaces best-fit roles for each candidate
7. Upsell touchpoints embedded throughout the journey

### Additional Features

- LinkedIn profile update suggester
- Resume updater (text input or voice)
- User journey tracking across assessments over time
- AI coaching layer (Phase 3)

---

## The Moat

Lauren Laughlin's recruiter network and hiring client relationships. She has 15 years on both sides of the hiring table — corporate + agency recruiting. 1,000+ placements across 50+ companies.

No SaaS tool can replicate: _"These aren't scraped jobs. These are roles we actively recruit for."_

---

## Target Audience (ICP)

**Phase 1:** Mid-to-senior tech professionals in the US (managers, directors, VPs, C-suite adjacent) actively or passively in job transition.

**Phase 2+:** Expand to adjacent niches (finance, consulting) once one niche is proven.

---

## The Team

| Person                | Role                                       | Strength                                        |
| --------------------- | ------------------------------------------ | ----------------------------------------------- |
| Lauren Laughlin       | Vision, IP, candidate experience, B2B lead | Brand, recruiter network, coaching expertise    |
| GT (Thrilok Abhishek) | Product, platform, AI/automation           | Full-stack build, GTM systems, AI tooling       |
| John Adams            | BD, employer + agency relationships, sales | Enterprise BD, strategic accounts, partnerships |
| Whitney               | UI/UX, chatbot                             | Design, candidate-facing experience             |

**Investor:** Lauren's uncle — $100k seed at ~$1M valuation (10% stake).

---

## Phase Roadmap

### Phase 0 — Prep

- Website redesign + funnel setup
- Pricing + offerings locked
- Lauren's content recorded (modules)
- Social profiles primed (Lauren + EC brand)
- Content strategy defined
- Tech stack confirmed, Supabase schema designed
- Intake form + email flows built

### Phase 1 — Prove (Gates-first)

**Gates — don't move to Phase 2 until all four are green:**

- 100 free candidates in the pool
- 30 paid candidates (any service or webinar)
- 3-5 confirmed employer/agency relationships
- 10-15 exclusive roles added per month

**Activities:**

- Paid webinars live
- Recorded content modules available
- Free AI tools as lead magnet
- Private job board live (Notion-gated initially)
- n8n automation for intake + nurture
- LinkedIn + Reddit organic 3x/week
- $30k marketing budget: LinkedIn ads + content production + one curated event

### Phase 2 — Build

- Full assessment engine (8-9 assessments)
- Candidate scoring + job matching algorithm
- Agency portal + employer dashboard
- Two streams connected via platform
- AI-assisted resume + LinkedIn tools
- Subscription tiers introduced
- Pivot audience if PMF signals suggest

### Phase 3 — Scale

- AI coach (personalised journeys)
- Enterprise / B2B white label
- Full Career OS platform
- Mobile app
- Coach portal (hire, train, assign)

---

## Tech Stack

| Layer                 | Tool                         | Notes                                       |
| --------------------- | ---------------------------- | ------------------------------------------- |
| Frontend              | Next.js + TypeScript + React | GT's primary stack                          |
| Database              | Supabase                     | Free until revenue. RLS for data separation |
| Hosting               | Vercel                       | Pro plan ~$20/mo once commercial            |
| Email (marketing)     | Loops                        | Free up to 1k contacts                      |
| Email (transactional) | Resend                       | Free up to 3k/mo                            |
| Payments              | Stripe                       | —                                           |
| Automation            | n8n (self-hosted)            | Hetzner VPS ~$6/mo                          |
| Analytics             | PostHog                      | Free tier sufficient for Phase 1            |
| Dev tooling           | Claude + Cursor              | GT's primary dev workflow                   |

**Not building in Phase 1:** custom SaaS platform, AI assessments, mobile app, Convex, VPS consolidation.

---

## Business Model

| Tier             | Access                                  | Price point |
| ---------------- | --------------------------------------- | ----------- |
| Free             | AI tools (Resume score, LinkedIn grade) | $0          |
| Entry paid       | Any webinar or à la carte service       | $TBD        |
| Coaching modules | Career Symmetry sessions (recorded)     | $TBD        |
| 1:1 coaching     | High-ticket, Lauren's time              | $2k+        |
| All paid tiers   | Lifetime access to private job board    | Included    |

**Stream 2:** Placement fees from direct employer clients + commission from agency network hires.

---

## Key Strategic Decisions Made

- **Not building another resume tool** — that's the free tier lead magnet, not the product
- **Exclusive job board is the moat** — not assessments, not AI tools
- **Any payment = lifetime job board access** — reduces friction, increases perceived value
- **Gates before platform build** — prove the flywheel manually before engineering it
- **Disposable channels first** — test with cold traffic (Reddit, paid ads) before activating warm network (Jim Huling, Doug Henderson / Visionaire Partners)
- **Lauren as brand validator, platform as separate entity** — to be confirmed: new brand vs. Empowered Careers

---
