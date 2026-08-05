# Design handoff — Onboarding restyle

**From:** Whitney (Design) · **For:** GT (Product/Build) · **Branch:** `design/onboarding-restyle`

This is a **cosmetic / design-layer** pass on the candidate onboarding flow. The goal is to bring the wizard onto the Empowered brand and remove the "prototype" tells, **with no behavior or logic changes**. Everything here is safe to pull and review as pure styling + copy.

Live UX reference (interactive prototype): the **Onboarding** view in the design playground → https://empowered-assessment.vercel.app/playground.html
Full written assessment: https://empowered-assessment.vercel.app/onboarding.html

---

## ✅ In this branch (cosmetic — ready to merge)

### 1. `src/components/onboarding/preferences-form.tsx` — re-skin to brand tokens

Replaced all hard-coded purple (`#534AB7`, `#3C3489`, `#EEEDFE`) with existing brand tokens, so the wizard matches the app and works in dark mode. **No logic touched** (29 line swaps, className/copy only).

| Element                                | Before                                       | After                                                    |
| -------------------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| Primary buttons (Next, View dashboard) | `bg-[#534AB7] text-white hover:bg-[#3C3489]` | `bg-primary text-primary-foreground hover:bg-primary/90` |
| Progress bar fill                      | `bg-[#534AB7]` (rounded)                     | `bg-accent` (sharp)                                      |
| Step tag pill                          | purple pill                                  | `bg-muted text-muted-foreground`, uppercase              |
| Text input focus ring                  | `ring-[#534AB7]/40`                          | `ring-ring`                                              |
| Selected option                        | `border-[#534AB7] bg-[#EEEDFE]`              | `border-foreground bg-accent/10`                         |
| Selected radio dot                     | purple fill                                  | `bg-foreground` w/ `bg-background` center                |
| Completion check badge                 | purple circle                                | `bg-accent/15`, `text-foreground`                        |
| Rounded corners on controls            | `rounded-md/lg`                              | removed (brand is sharp / 0 radius)                      |

### 2. Copy cleanup (same file) — drop the ™ program names

The per-step tags read like a coaching funnel to senior candidates. Renamed to plain section labels (no logic, display strings only):
`Career Navigator™ → Your search` · `North Star Discovery™ → Your goals` · `Mindset Mastery™ → Mindset` · `Brand Magnification™ → Your readiness` · `Distinguished Dialogues™ → Support`

### 3. `src/data/target-roles.ts` — role suggestion list (new, inert data file)

An extensive tech / tech-adjacent / leadership role list for the "What roles are you targeting?" autocomplete. ~250 entries, safe to import when the typeahead is built. Custom (free-text) roles should always be allowed on top of these.

---

## 🔨 NOT in this branch (needs engineering — Whitney's design spec only)

These are recommended but are **behavior/feature changes**, so they're GT's call, not part of the cosmetic pull. The intended UX for each is shown in the playground prototype.

> **Update 2026-07-31:** the cosmetic branch was merged, and items 1, 2, and 6 below were
> built on top of it. Items 3, 4, and 5 remain open.

1. ✅ **Multi-role autocomplete input** — built as `src/components/onboarding/role-tag-input.tsx` (cmdk + `target-roles.ts`, chips, free-text allowed). Roles persist comma-joined in `candidate_preferences.target_role`.
2. ✅ **Honest time** — dashboard banner now says "about 2 minutes". The 4-phase regrouping was **not** done; still 15 one-per-screen questions.
3. **Framed resume moment.** `dashboard/page.tsx` silently `redirect("/resume")` for new users — add a short welcome/why instead.
4. **LinkedIn-first sign-up** on `login/page.tsx` (it auto-fills profile + powers matching).
5. **Skip / save-and-return** — still open. (**Radiogroup accessibility** ✅ done: options now use the Radix `RadioGroup` from `src/components/ui/radio-group.tsx`, not `<button>`s.)
6. ✅ **Progress bar math** — now `(step + 1) / TOTAL`, reaches 100% on the final step.

---

## How to pull

```bash
git fetch origin
git checkout design/onboarding-restyle
npm run dev   # review /onboarding/preferences
```

Verified before handoff: `npm run lint` clean, `npm run type-check` clean. No files touched outside the three listed above.
