# Dormant surfaces

Roughly half this codebase serves a product the platform no longer sells. It is kept
on purpose. This page exists so you don't spend your first week wondering why.

**The rule:** _dormant ≠ deleted._ Don't build on it. Don't delete it.

---

## What happened

The platform launched job-board-first: a curated board of exclusive roles, gated by a
subscription tier, with matching, an employer portal, and placement commissions.

In August 2026 it pivoted to coaching-first. Revenue is now **à la carte only** —
1:1 coaching, courses, and individual career services. There are no subscriptions.

Rather than rip out the old product, the pivot **unlinked** it: schema stays, routes
stay, admin surfaces stay, but nothing in candidate navigation points at it.

Direction: [`../ec-pivot-brief.md`](../ec-pivot-brief.md).
Implementation: [`../ec-pivot-plan.md`](../ec-pivot-plan.md).

## Why keep it

- Re-linking is cheap; rebuilding is not. The nav config is literally one array —
  `sidebarConfig["/job-board"]` is preserved so that re-adding a tab in `topNavTabs`
  restores the whole surface.
- The admin surfaces are still used operationally.
- Deleting tables means deleting migrations and RLS policies that other live tables
  reference.

The code says so itself, in `src/components/app-shell/sidebar-config.ts`:

> Job Board is deliberately absent: the coaching/content pivot unlinks the board from
> candidate nav without deleting it. `sidebarConfig["/job-board"]` above is kept
> dormant so re-adding the tab here is the whole pivot-back.

---

## 1. The job board

**Routes** — reachable by URL, absent from nav:
`/job-board` · `/job-board/saved` · `/job-board/[id]`

**Tables:** `jobs`, `saved_jobs`, `applications`, `job_scores`

**Also dormant:** the `job_tier` enum and the `can_see_job_tier()` database function,
which gated job visibility by subscription plan.

**Live nav** is `/dashboard`, `/pipeline`, `/content` (labelled "My Coaching") — see
`topNavTabs`.

Shipped plan, historical only: [`../done/ec-job-board-plan.md`](../done/ec-job-board-plan.md).

## 2. Matching

Specified in detail, **never built**. `matches` and `job_scores` have schema and
**zero references** anywhere in application code.

Specs moved to `docs/deferred/`: `ec-matching-implementation-plan.md`,
`ec-matching-sprint-plan.md`. The approach was sound; it just depends on job-board
inventory that no longer accumulates.

The pivot's **JD → ATS checker** (`/jd-match`, the `jds` table, the `match-jd` Inngest
function) reuses the same scoring approach, candidate-initiated against a pasted job
description. That part **is live**.

## 3. Employer portal

**Routes:** `/employer`, `/employer/jobs`, `/employer/clients`,
`/employer/applications`, `/employer/placements`

**Tables:** `employers`, `client_companies`, `placements`, `commissions`

**Role:** `user_role = 'employer'`. `src/app/(app)/layout.tsx` still redirects these
accounts to `/employer`, and RLS still scopes their rows via `current_employer_id()`.

Functional, just not part of the current business.

## 4. Subscriptions

The most important dormant surface, because it's the one you're most likely to
accidentally extend.

**Frozen, not extended:**

- `profiles.plan` — enum `free` / `plan_1` / `plan_2` / `plan_3`
- `profiles.subscription_status`, `profiles.billing_cadence`
- `comparePlans()` in `src/lib/plan.ts`
- `can_see_job_tier()` and `is_paid_subscriber()` database functions
- `STRIPE_PRICE_CORE_*` / `STRIPE_PRICE_PRO_*` environment variables
- `customer.subscription.*` and `invoice.*` handlers in the Stripe webhook

> **Never add a plan-based gate.** New entitlements route through `enrollments`.

`billing_cadence` still has `monthly` / `quarterly` / `annual` values. Only `one_time`
is used.

Shipped plan, historical only: [`../done/ec-paywall-plan.md`](../done/ec-paywall-plan.md).

## 5. Cal.com

`src/lib/cal.ts` and `src/app/api/cal/webhook/route.ts` are a complete, unused twin of
the Calendly integration, gated behind `CAL_WEBHOOK_SECRET`. No account behind it. It
exists as a swap-in alternative. See [`services.md`](services.md#calcom).

---

## Zero-reference tables

`job_scores`, `matches`, and `referrals` have schema and **no application code at
all**. They are the furthest-gone remnants. Still don't delete them without asking —
migrations and policies reference them.

---

## What to do when you hit dormant code

| Situation                                   | Do this                                     |
| ------------------------------------------- | ------------------------------------------- |
| A feature needs job-board data              | Stop and ask. It probably shouldn't         |
| You want to delete a dormant table or route | Ask first. Default answer is no             |
| You need a new entitlement check            | Use `enrollments`. Never `plan`             |
| A dormant surface has a bug                 | Note it; don't fix it unless asked          |
| A doc describes the job board as current    | Check its pivot banner — the pivot docs win |
| You're unsure whether something is dormant  | Is it in `topNavTabs`? If not, probably yes |
