# Empowered Careers — UI Plan (End State)

> Last updated: 2026-05-15
> Scope: post-login candidate experience, end state (Phase 2+). Phase 1 builds toward this shell.

---

## Design Principles

1. **Concierge, not dashboard.** This is Lauren's network, productized. The UI should feel curated, not transactional. Closer to a private members' club than a SaaS admin.
2. **Top nav = where you are. Left sidebar = what you do there.** The two axes never overlap. A user always knows which tab they're in and what actions are scoped to it.
3. **Ask once, reuse forever.** Resume, LinkedIn, assessments, preferences — captured in one place, surfaced everywhere they're useful. No field is ever asked twice.
4. **Every empty state is an invitation.** No blank screens. An empty Pipeline shows the highest-fit Tier 1 roles. An empty Assessments tab shows what unlocks when complete.
5. **Nudges are contextual, never popups.** They appear inline where the action makes sense. If a candidate is on Pipeline, the nudge offers interview prep — not a coaching module.
6. **Luxury cues, not luxury clichés.** Dark base, lime accents, generous whitespace, cards over tables, typography does the heavy lifting. No gradients, no glassmorphism, no marketing fluff inside the app.

---

## Global Frame

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Logo]   Dashboard  Pipeline  Job Board  Content & Courses    🔍 ☀ 👤│
├──────────────┬──────────────────────────────────────────────────────┤
│              │                                                      │
│  Contextual  │                                                      │
│  Sidebar     │              Main Canvas                             │
│              │                                                      │
│  (collapsible)│                                                     │
│              │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

### Top Nav (4 buckets)

| Tab                   | Purpose                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| **Dashboard**         | Snapshot — profile health, nudges, notifications, next actions         |
| **Pipeline**          | Job matches + application tracking (Kanban or list)                    |
| **Job Board**         | Full browsable inventory — all Job Tiers                               |
| **Content & Courses** | Lauren's content, partner content, events — free and paid (Plan-gated) |

**Right cluster:** Search (global, cmd-K), Light/Dark toggle, Avatar menu (Profile, Billing, Settings, Sign Out).

### Left Sidebar — contextual per tab

Collapsible (Slack/Asana pattern). Pinned profile chip at bottom on all tabs: photo + completeness ring + name. Click chip → opens full Profile page.

---

## Tab 1 — Dashboard

**Purpose:** the candidate's daily landing pad. Health check + what's next.

### Sidebar items

- My Profile
- Resume
- Assessments
- LinkedIn Grade

### Main canvas (sections, top to bottom)

1. **Greeting strip** — "Good morning, [Name]. 3 new matches this week." Plain text, no card chrome.
2. **Profile completeness card** — single hero card with ring + 3 highest-leverage next actions. Each action is a single CTA.
3. **Active nudges row** — 2–3 cards, contextual: low ATS → resume review, assessment incomplete → start, Plan upgrade prompt if applicable.
4. **Recent activity** — quiet timeline: matches added, assessment completed, content recommended, sessions booked.
5. **Recommended for you** — 3 cards: 1 top match, 1 course, 1 article. Cross-surface promotion to drive engagement.

**Empty/new-user state:** completeness ring shows 25% (signed up + uploaded resume). Single hero CTA: "Take your first assessment — unlock Job Tier 2."

### Sub-pages (sidebar items)

- **My Profile** — name, headline, current role, target role, location, photo. Inline edit, no separate edit page.
- **Resume** — current version + version history, Resume score breakdown, staleness indicator, "request rewrite" CTA. Upload new replaces, doesn't append blindly.
- **Assessments** — list of 5 (Phase 1) / 8–9 (Phase 2) with status (locked/available/complete) + dimension score visualization. Click → assessment runner.
- **LinkedIn Grade** — visibility score, headline analysis, keyword gaps, free tip + paid audit CTA.

---

## Tab 2 — Pipeline

**Purpose:** the candidate's personal funnel. Where matches become applications become offers.

### Sidebar items

- Matched roles (default view)
- Applied
- Saved
- View toggle: Kanban / List

### Main canvas

**Kanban view (default for ≤20 active applications):**

| Interested | Submitted | Screening | Interviewing | Offer | Placed |
| ---------- | --------- | --------- | ------------ | ----- | ------ |

Cards: company logo, title, match score, last update, days-in-stage. Drag to update stage (or status changes flow from Lauren).

**List view (default for >20 or user toggle):**
Sortable table: role, company, stage, match score, last activity, days in stage, action.

### Card interactions

- Click → side-panel slide-out with full role detail, application history audit trail, internal Lauren notes (if shared), interview prep CTA per stage.
- Stage change → fires lifecycle event → Loops nudge (e.g. "interview prep upsell" when stage moves to Interviewing).

**Empty state:** "You haven't expressed interest in any roles yet. Here are 3 strong matches →" with cards inlined.

---

## Tab 3 — Job Board

**Purpose:** browsable inventory. Power-user / curiosity surface, not the hero.

### Sidebar items

- All roles (default — Plan-filtered)
- Job Tier 1 (visible to all)
- Job Tier 2 (Plan 2+)
- Job Tier 3 (Plan 3 or à la carte)
- Saved searches
- Saved roles

### Main canvas

- Filter bar: role family, seniority, location, remote policy, salary, match-score threshold
- Results: card grid (3 across desktop, 1 mobile)
- Each card: title, company, Job Tier badge, match score, match reasoning preview, "Express interest" CTA, Save toggle
- Locked cards (above candidate's Plan) show ghost cards with Plan upgrade prompt — not hidden entirely. Visible scarcity is the whole point.

### Differentiator vs. Pipeline

- Pipeline = "your roles." Job Board = "all roles."
- Expressing interest from Job Board automatically adds to Pipeline.
- Job Board has no application-stage data — purely discovery.

---

## Tab 4 — Content & Courses

**Purpose:** Lauren's IP + partner content + events. Free at the bottom of the funnel, paid as it gets deeper. Per the user's earlier answer: gated by Plan.

### Sidebar items

- Articles
- Videos
- Courses (modules — Career Symmetry etc.)
- Coaching (1:1 sessions, group programs — surfaced here, same product family, just a different UI affordance with a more personalized list)
- Upcoming Events (webinars, live sessions)

### Main canvas

**Articles / Videos / Events:**

- Card grid with Plan badge per item (Free / Plan 2 / Plan 3)
- Plan-locked items are visible but blurred-title with "Upgrade to read" overlay
- Filter by topic + completion status

**Courses:**

- "Continue" rail — currently enrolled modules with progress bars (fed by external host webhook → `enrollments` table)
- "Recommended for you" rail — based on assessments and current pipeline stage
- "Browse" rail — full catalog

**Coaching (sub-tab inside Content & Courses):**

- Personalized list — different visual treatment because the candidate has a relationship with their coach
- Upcoming sessions (Cal.com embed for booking new)
- Past sessions with notes from coach (if Lauren chose to share)
- "Book a session" CTA — gated to Plan 3 or per-session purchase

---

## Profile — the everywhere object

Profile is **not** a top-nav tab. It lives in two places:

1. **Pinned sidebar chip** (all tabs, bottom of left sidebar) — photo, name, completeness ring at a glance. Click → full Profile page.
2. **Avatar menu** (top-right) — quick links: Profile, Billing, Settings, Sign out.

The Profile page itself is a dedicated route with tabs:

- Overview (the same content as Dashboard → My Profile)
- Resume
- Assessments
- LinkedIn
- Services & Subscriptions
- Billing & Payments
- Settings (notifications, password, etc.)

Dashboard's sidebar items (Resume, Assessments, LinkedIn Grade) are **shortcuts into the Profile tabs**, not duplicate surfaces. One source of truth.

---

## Cross-cutting UX rules

### Data reuse

- Resume parse → populates target role, skills, experience snippets. Never re-asked.
- LinkedIn OAuth → populates name, headline, current role, photo. Never re-asked.
- Assessments → populate match reasoning, course recommendations, coaching prompts. One completion, many surfaces.
- Saved jobs → visible in both Pipeline (Saved) and Job Board (Saved roles).

### Plan-gating display rules

- Locked features are **visible, not hidden.** Visibility creates desire; hiding creates surprise.
- Lock states are styled consistently: subtle overlay, Plan badge, single CTA "Unlock with Plan X."
- Never lock a CTA without explaining what it unlocks.

### Nudges

- Always inline at the point of relevance. Never a modal, never a toast unless it's a confirmation.
- One active nudge per surface. Stacked nudges feel desperate.
- Dismiss is honored — never re-show the same nudge after dismiss within 7 days.

### Motion

- Subtle, never decorative. Page transitions: 200ms fade. Card hover: 100ms lift. Drag-and-drop in Kanban: physical, snappy.
- No scroll-jacking, no parallax, no entrance animations on data.

### Theme

- Default: dark. Light available via toggle (top-right).
- Brand accent: lime (single accent — used for primary CTAs, progress, active state).
- Type: one serif for headlines (sets the tone), one sans for body (gets out of the way).
- Surfaces: 2 elevation levels max. Cards = elevation 1. Modals/drawers = elevation 2.

### Mobile

- Top nav collapses into a bottom tab bar (4 buckets remain).
- Left sidebar becomes a sheet that slides up from the section header.
- Profile chip becomes the bottom-right tab item.
- Kanban auto-switches to List on mobile.

---

## Build Sequence (mapped to `ec-dev-plan.md` sprints)

| Sprint | UI delivered                                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------------------------------- |
| S1     | Shell only — top nav (4 tabs), sidebar frame, theme tokens, profile chip pinned. Tabs route to placeholders.            |
| S2     | Dashboard tab live: completeness card, ATS card, Resume sub-page. Marketing trust signals.                              |
| S3     | Avatar menu + Billing tab (Plan management). Plan-gated lock states on Job Board ghost cards.                           |
| S4     | Job Board tab live: filter bar, card grid, Express Interest flow. Pipeline tab shell with Interested column populating. |
| S5     | Assessments sub-page + assessment runner. Dashboard nudge cards driven by score state.                                  |
| S6     | Pipeline tab fully live: Kanban + List, stage transitions, side-panel detail. Lauren admin equivalent.                  |
| S7     | Content & Courses tab live: Articles/Videos/Courses/Coaching rails. Cal.com embed.                                      |
| S8     | Nudges system fully populated across all tabs. Inline placement, no modals. Mobile pass.                                |

---

## Open design questions (for design review, not blocking dev)

- Bloomberg-terminal density vs. concierge whitespace — where exactly on the spectrum? Probably density for Pipeline (Kanban), whitespace for Content & Courses (browsing). Validate with prototype.
- Match reasoning surface — single sentence, expandable, or always-expanded? Probably collapsed by default with a single click to expand.
- Where does the Profile completeness ring live in Pipeline / Job Board tabs (where its sidebar items aren't present)? Probably: persistent in sidebar chip, not duplicated.
- Notifications — bell icon in top-right or inline activity feed only? Likely both: inline for default, bell for cross-tab interrupts (new match, stage change by Lauren).
