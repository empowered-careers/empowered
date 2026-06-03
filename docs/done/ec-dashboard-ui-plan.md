# Dashboard UI alignment with mockup

## Context

The candidate dashboard at `/dashboard` has diverged visually from the agreed mockup at `docs/prototypes/ec-ui-mock.html`. The data is already fetched (profile strength, blueprint, jobs, resumes) but the current `src/components/dashboard/dashboard-client.tsx` renders a flat 3-column grid (`ResumeCard`, `ProfileStrengthCard`, `JobBoardTeaser`) and is missing the mockup's hero ring + next-actions, the "For your attention" nudges grid, and the stats column.

This plan covers UI/UX changes only. The notifications backend is tracked separately in `docs/ec-notifications-plan.md`.

---

## 1. Hero: profile completeness ring + next-actions

Restyle `src/components/dashboard/profile-strength-card.tsx` to match the mockup's hero (lines 1101–1212 of `ec-ui-mock.html`). Rename the export to `ProfileStrengthHero`.

- Layout becomes a single wide card spanning 2 columns of the top row: left = 96px circular SVG ring with percentage inside (Cormorant Garamond, 28px), right = list of up to 3 incomplete next-actions stacked vertically.
- Ring math: `strokeDasharray = 2 * π * r`, `strokeDashoffset = circumference * (1 - percent/100)`.
- Reuse `getProfileStrength()` from `src/hooks/use-dashboard-data.ts:107-129` for the percent and the step list — keep the existing step icons.
- Each next-action row: small circular icon container (accent color), label with bold first phrase + muted suffix ("· unlocks X"), "+N" point delta on the right, arrow.

## 2. Stats column (Active matches + Resume score)

New `src/components/dashboard/stat-card.tsx`: card with uppercase title, big Cormorant numeral, optional delta line ("+3 this week") or sub line. Stack two in the right column of row 1.

- **Active matches**: value = `activeJobCount` (already in props). Defer the delta and show "active this week" subtext for v1.
- **Resume score**: pull from the latest resume's `score`. Sub: "Strong. Top quartile." if score ≥ 80, else neutral copy.
- ATS / match score is deferred until `matches.match_score` is populated.

## 3. "For your attention" nudges grid

Nudges are **derived state**, not stored. New file `src/lib/dashboard/nudges.ts` exporting a pure function `computeNudges(input): Nudge[]` where `Nudge = { id, tag, title, body, cta: { label, href } | null, priority }`.

Inputs are the data already fetched in `src/app/dashboard/page.tsx` (profile, resumes, blueprint, activeJobCount) plus one new fetch: the latest application in `interviewing` stage (join `applications` → `jobs`).

Starter rules:

- **Pipeline · Interviewing**: if any application is in `interviewing` → CTA "View interview" → `/pipeline`.
- **Profile**: if profile strength < 100 → title shows which assessments remain, CTA → next missing step.
- **Plan**: if user is Free and has matches they can't unlock → CTA → `/pricing`. Otherwise fall back to a generic content nudge.

Render at most 3, ordered by priority. New client component `src/components/dashboard/nudges-grid.tsx`. Styling matches the mockup: bordered card with a 2px left accent border, uppercase tag, title, copy, CTA button.

## 4. Dashboard reflow

Update `src/components/dashboard/dashboard-client.tsx`:

- Row 1 (`grid-cols-3`, 2fr/1fr split): `ProfileStrengthHero` (col-span-2) + stats stack (1 col with two `StatCard`s).
- Row 2: `NudgesGrid` (full width, 3 columns).
- Row 3 (`grid-cols-2`): keep `ResumeCard` left, `JobBoardTeaser` right.
- Onboarding alert and Blueprint Sparkle banner stay above the hero unchanged.

## Files to add / modify

**New:**

- `src/components/dashboard/nudges-grid.tsx`
- `src/components/dashboard/stat-card.tsx`
- `src/lib/dashboard/nudges.ts`

**Modify:**

- `src/components/dashboard/profile-strength-card.tsx` — restyle to ring hero, export as `ProfileStrengthHero`.
- `src/components/dashboard/dashboard-client.tsx` — new layout (hero + stats / nudges / resume + job).
- `src/app/dashboard/page.tsx` — fetch the interviewing-application nudge input, call `computeNudges`, pass `initialData`.

## Verification

1. `npm run type-check && npm run lint` clean.
2. `npm run dev`, log in, open `/dashboard`:
   - Hero ring percent matches `getProfileStrength()` output.
   - Stats cards show correct `activeJobCount` and resume score.
   - Nudges grid renders 1–3 cards; toggle profile completeness states and confirm nudges re-compute on refresh.
   - Layout matches mockup at 1280px wide and reflows cleanly to single column on mobile.
3. `npm run build` succeeds.
