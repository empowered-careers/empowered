# Nudges v2 — scaling the dashboard nudges engine

> **Status: deferred.** Do not build until the trigger conditions below are met. v1 (three hardcoded rules) is sufficient today.

## Context

The dashboard "For your attention" grid (`docs/ec-dashboard-ui-plan.md`, shipped) renders **nudges** — derived state computed by `computeNudges()` in `src/lib/dashboard/nudges.ts`. v1 is a fixed `if`-chain producing at most one nudge per rule (Pipeline → Profile → Plan/Content), sorted by a hardcoded integer `priority` and sliced to 3.

This is fine for three rules. It does not scale to the volume we expect: multiple concurrent application status changes, one nudge per incomplete assessment, several paid-service pushes, and content recommendations. This doc captures how to evolve it when that volume arrives, so the design isn't re-derived under pressure.

For the conceptual line between a **nudge** (standing, state-driven, self-clears) and a **notification** (ephemeral event, persisted, user-dismissed), see the "Notifications vs. Nudges" section in `docs/ec-notifications-plan.md`. v2 does not change that boundary.

## Problems with v1 at scale

- **Monolithic function** — every new nudge type edits the same `computeNudges()`; rules start interacting (the Plan/Content `else` is already a smell).
- **Hardcoded integer priorities** collide and become unreasonable past ~10 rules.
- **No dedup / no cap per category** — 4 application status changes would emit 4 near-identical pipeline nudges and crowd out everything else.
- **No dismissal, no cooldown, no "seen" state** — a nudge the user dismissed or already acted on reappears on every render, because nothing is persisted. This is the blocker for commercial pushes (don't pitch the same paid service every visit).

## Stage 1 — Provider registry (still fully derived, no DB)

Trigger to build: when we cross **~5–6 nudge types**, or the first time a single category needs to emit a variable number of nudges.

Break the monolith into independent providers, each owning one concern and returning 0..n nudges:

```ts
type NudgeContext = {
  profile;
  resumes;
  blueprint;
  activeJobCount;
  interviewingApplications: InterviewingApplication[]; // now plural
  incompleteAssessments: Assessment[];
  // add signals as rules need them
};

type NudgeProvider = {
  id: string;
  category: "pipeline" | "profile" | "plan" | "content" | "service";
  produce: (ctx: NudgeContext) => Nudge[];
};

const PROVIDERS: NudgeProvider[] = [
  pipelineProvider,
  profileProvider /* ... */,
];

function computeNudges(ctx: NudgeContext): Nudge[] {
  return rank(PROVIDERS.flatMap((p) => p.produce(ctx)));
}
```

`rank()` is where scaling logic concentrates:

- **Score, don't hardcode.** `score = baseWeight(category) + urgencyBoost`, e.g. an interview two days out outranks one next month. Tune weights in one place.
- **Category caps** — e.g. at most 1 pipeline + 1 profile + 1 commercial visible at once. With 4 status changes, the pipeline provider returns the single most urgent; the cap enforces it regardless.
- **Slice after ranking** — same final `.slice(0, 3)` as v1.

Each provider is independently unit-testable. New nudge _types_ need no schema change. This covers "many incomplete assessments" and "many status changes" cleanly.

**Files:** refactor `src/lib/dashboard/nudges.ts` into the registry + `rank()`; one file per provider under `src/lib/dashboard/nudges/`. `buildProfileSteps()` in `src/lib/dashboard/steps.ts` stays the shared source for the profile provider and the hero.

## Stage 2 — Persistence (only when behavior demands memory)

Trigger to build: the first concrete requirement for any of — **dismissal** ("don't show this again"), **frequency cap / cooldown** on commercial pushes, **cross-surface consistency** (same nudge in dashboard + email), or **conversion analytics**.

Do **not** store the nudges themselves — they remain derived. Store only the user's _interactions_ with them:

```sql
create table nudge_interactions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  nudge_id    text not null,            -- stable provider nudge id, e.g. 'nudge-service-prep'
  action      text not null,            -- 'dismissed' | 'clicked' | 'shown'
  created_at  timestamptz not null default now()
);
create index nudge_interactions_profile_idx on nudge_interactions (profile_id, nudge_id);
```

- RLS: `profile_id = auth.uid()` for select/insert.
- `rank()` joins this into `NudgeContext` and filters out anything dismissed, or any commercial nudge whose last `shown` is within its cooldown window.
- This preserves the "derived from current state" property — the table adds _memory_, not _content_.

For stable dismissal/cooldown, nudge `id`s must be deterministic (not random per render) — already true in v1.

## Out of scope

- Merging nudges and notifications (explicitly kept separate — see `ec-notifications-plan.md`).
- ML/personalized ranking — `rank()` stays rules-based.
- Admin-authored nudges — if marketing later wants to push arbitrary campaign nudges, that's a separate stored-content system, closer to notifications than to this derived engine.

## Verification (per stage)

1. `npm run type-check && npm run lint` clean.
2. **Stage 1:** unit-test each provider in isolation; confirm category caps hold when a category over-produces (e.g. 4 interviewing apps → 1 visible pipeline nudge). Dashboard still renders ≤ 3, ranked.
3. **Stage 2:** dismiss a nudge → it stays gone across reloads; a commercial nudge respects its cooldown; RLS prevents user A reading user B's interactions.
