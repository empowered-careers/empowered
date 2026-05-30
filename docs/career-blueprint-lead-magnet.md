# Career Identity Blueprint™ — Public Lead-Magnet Plan (Future)

> Status: **Planned for later. DO NOT implement yet.**
> Scope: Deliverable 2 — a standalone public ads page that extracts a _section_ of the
> Blueprint as an anonymous, no-login lead-generation funnel.
> Prerequisite: Deliverable 1 shipped (`docs/career-blueprint-integration.md`) — this reuses
> its questions + scoring engine.

---

## 1. Context & Goal

The in-app Blueprint (Deliverable 1) lives behind login. Per `docs/assessment.md`, the free
QuickStart scan is explicitly designed for **virality, referrals, and lead generation**
("No sign-up required"). To exploit that for paid acquisition, we extract a **short section**
of the Blueprint into a public, anonymous page suitable for ad traffic.

**Goal:** A cold visitor from an ad takes a ~2-minute scan with no account, gets an
identity-forming teaser result (_"You lead like a Vision-Led Leader™"_), and converts to
signup to unlock the full Blueprint and matched roles. The captured email becomes a lead in
the existing acquisition layer, and the anonymous answers carry over so the in-app Blueprint
is pre-filled after signup.

This funnel must **not fork the assessment logic** — it reuses the same `questions.ts` subset
and `blueprint.ts` scoring built in Deliverable 1.

---

## 2. Funnel Section to Extract

Recommend the punchiest, most identity-forming slice rather than the full 30 questions:

- **Leadership & Influence** (prototype Qs 6–10) + **Company Culture Fit** (Qs 11–15)
  → ~8–10 questions, ~2 minutes.
- These produce the two most shareable, "I am a \_\_\_" outputs: **Leadership Style** and
  **Company Fit** — the strongest hooks for ad creative and social sharing.

The teaser computes a partial result from this subset using the same `scoreBlueprint`-style
functions (a `scoreBlueprintSubset(answers)` variant). Full archetype, symmetry, burnout,
energy audit, and guidance stay gated behind signup + the full in-app run.

---

## 3. Surface & Routing

- **Public route outside `(app)`** (e.g. `src/app/blueprint/page.tsx`) — `index`-able
  (`robots: index`), unlike the authed `/assessment`.
- **OG image** via the existing `src/app/api/og/route.tsx` for rich social/ad cards.
- Screens: hero/welcome → short question runner → **teaser result** → conversion CTA
  ("Sign up to save your Blueprint & unlock matched roles").
- Reuse the result sub-components from `src/components/assessment/` (archetype/style hero,
  fit card) for visual continuity with the in-app experience.

---

## 4. Anonymous → Authenticated Continuity

The existing `leads` table already bridges anonymous acquisition → signup via **email match
at the OAuth callback** (`leads.converted_profile_id` is stamped when an authenticated user's
email matches a lead row; `profiles.lead_id` / `acquisition_source` / `acquisition_ref` mirror
the source). Reuse this rather than inventing a new bridge:

1. Anonymous visitor completes the subset; answers held client-side (cookie / localStorage).
2. On the teaser CTA, capture email → write a `leads` row (service-role, via an API route
   modeled on `src/app/api/events/register/route.ts`), tagging `source` / `source_ref` with
   the ad campaign, and stashing the subset answers (see Open Questions for where).
3. After OAuth signup, the callback's existing lead-match logic stamps the profile.
4. A post-signup step replays the stored subset answers through `submitBlueprint` so the
   in-app Blueprint runner is pre-filled (candidate finishes the remaining sections instead
   of starting over).

---

## 5. Lead Capture

- Tie into the existing **`leads` / `events` acquisition layer** (recent
  "events and leads schema" commit; `app/api/events/*`) — **do not** add a new table.
- `leads.source` ∈ `linkedin | email | instagram | direct | referral | other`;
  `leads.source_ref` carries the campaign slug / ad id.
- Service-role writes bypass RLS (same pattern as `/api/events/register`); candidates have no
  self-read on `leads`, which is fine — they never need to see their own lead row.

---

## 6. Open Questions (resolve before building)

- **Anonymous answer storage:** cookie/localStorage only, or persist onto the `leads` row
  (e.g. a new `lead_payload jsonb` column) so answers survive across devices?
- **RLS for anonymous writes:** confirm the service-role API-route pattern is the right
  boundary; no anon client writes to `leads` directly.
- **Does the public slice write any `candidate_scores`?** Recommended: **no** — scores are an
  authenticated, post-signup concern; the public funnel only stores the lead + answers.
- **Teaser reveal depth:** how much to show before the gate — full leadership-style + fit
  cards, or a partial/blurred reveal that maximizes signup conversion?
- **Abuse / rate limiting** on the public submit + email capture endpoints.
- **Analytics:** funnel events (start → complete subset → email captured → signup) — wire into
  whatever analytics the acquisition layer uses.

---

## 7. Out of Scope (for this funnel)

- The full 30-question run, premium Deep Dive, and `candidate_scores` population — all remain
  the in-app Blueprint's job (`docs/career-blueprint-integration.md`).
- No new assessment scoring logic — strictly a subset of the existing engine.
