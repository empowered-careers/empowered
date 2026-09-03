# Empowered Careers — Contributor Guide

> Read this before you touch anything. Seriously.

---

## The One Rule

**If it's not in your assigned sprint task, don't touch it.**

This codebase has paying users (soon). Every uncoordinated change to shared infrastructure — schema, auth, Inngest functions, RLS policies, shared components — creates bugs that are hard to trace and expensive to fix. When in doubt, ask GT first.

---

## Stack at a Glance

| Layer           | Tool                               | Notes                                                                   |
| --------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| Frontend        | Next.js 16 + TypeScript + React 19 | App Router only. No Pages Router.                                       |
| Components      | shadcn/ui                          | Don't install other UI libraries without approval                       |
| Database        | Supabase (PostgreSQL)              | All queries go through the typed client                                 |
| Auth            | Supabase Auth                      | Google + LinkedIn OAuth. Do not touch auth flow.                        |
| Background jobs | Inngest                            | No raw API routes for async work                                        |
| Payments        | Stripe                             | Handled by GT only                                                      |
| Email           | Loops                              | Fired from server actions via `src/lib/loops/`. Sequences not yet built |
| Booking         | Calendly                           | Webhook into `coaching_sessions`. Cal.com twin is dormant               |
| Hosting         | Vercel Pro                         | Deploys on merge to `main`                                              |
| Automation      | n8n (self-hosted on Hetzner)       | GT-managed, external — no code in this repo                             |

Per-service setup, dashboards, and failure modes: [`docs/handover/services.md`](docs/handover/services.md).

---

## Branching

```
main                          ← production. Direct pushes are blocked.
feat/vercel-analytics         ← format: feat/[short-description]
fix/resume-upload-gate        ← format: fix/[short-description]
chore/prettierignore-artifacts  ← format: chore/[short-description]
design/landing-page-handoff   ← format: design/[short-description]
```

- **Never push directly to `main`.**
- Branch off `main`. (There is no long-lived `dev` branch — an earlier version of
  this guide described one, but every branch in the repo's history has gone
  straight to `main` via PR.)
- One branch per task. Don't bundle unrelated changes.
- PRs require review before merging.

---

## Before You Start Any Task

1. Pull latest `main` — `git pull origin main`
2. Check [`docs/handover/open-items.md`](docs/handover/open-items.md) for what's
   unfinished, and `docs/todo.md` for the raw ops checklist
3. Read [`docs/ec-pivot-brief.md`](docs/ec-pivot-brief.md) and
   [`docs/ec-pivot-plan.md`](docs/ec-pivot-plan.md) — they override any older doc.
   (`ec-dev-plan.md`, cited by an earlier version of this guide, is deprecated.)
4. If your task touches the database, read [`docs/db_schema.md`](docs/db_schema.md)
   and [`docs/handover/data-model.md`](docs/handover/data-model.md) first
5. Ask if anything is unclear — 5 minutes of alignment saves hours of rollback

---

## Vocabulary — Get This Right

The codebase uses precise terms. Using the wrong one in code, comments, or PRs causes confusion.

| Term                | Meaning                                                                     |
| ------------------- | --------------------------------------------------------------------------- |
| **Enrollment**      | The live entitlement. A row in `enrollments`, written by the Stripe webhook |
| **Product**         | A purchasable SKU in `coaching_products` — `kind` of `session` or `course`  |
| **Plan**            | ⚠️ DORMANT. `free`, `plan_1`, `plan_2`, `plan_3`. Frozen, not extended      |
| **Job Tier**        | ⚠️ DORMANT. Exclusivity of a job posting: `tier_1`, `tier_2`, `tier_3`      |
| **Billing cadence** | `one_time`, `monthly`, `quarterly`, `annual` — only `one_time` is live      |

Never say just "Tier 1" or "Tier 2" — always qualify as **Plan** or **Job Tier**.

**Entitlement is an enrollment, never a plan.** Revenue is à la carte only; there are
no subscriptions. Never add a plan-based gate — see `CLAUDE.md` rule 2 and
[`docs/handover/dormant-surfaces.md`](docs/handover/dormant-surfaces.md).

---

## Database Rules

### Migrations

- Every schema change = a new migration file in `supabase/migrations/`
- Filename format: `YYYYMMDDHHMMSS_description.sql`
- **Never edit an already-applied migration.** Write a new one.
- Every new table needs RLS policies **in the same migration**. No exceptions.
- Run `npm run supabase:types` after any migration to regenerate `src/types/database.types.ts`

### Queries

- Use the typed Supabase client from `src/lib/supabase/`
- Server components → `createServerClient()`
- Server actions / API routes → `createServerClient()` or service client for admin ops
- Client components → `createBrowserClient()`
- **Never use the service-role client (`src/lib/supabase/service.ts`) in client-side code**

### What you must not touch without GT's sign-off

- `profiles` table — auth-linked, Plan state lives here
- `handle_new_user()` and `handle_auth_user_updated()` triggers
- RLS policies on `resumes`, `jobs`, `applications`, `payments`
- Any migration that already ran on production

---

## Background Jobs (Inngest)

- Async work goes through Inngest functions in `src/inngest/functions/`
- **Do not create new raw API routes for async or long-running work**
- Register new functions in the `serve({ functions: [...] })` array in `src/app/api/inngest/route.ts`
- After deploying a new or changed function, re-sync the endpoint: `curl -X PUT https://<domain>/api/inngest`
- Concurrency is capped at 5 per function — don't remove that limit
- LLM calls live in `src/lib/llm/` — don't call the Anthropic API directly from components or actions

---

## Component & File Conventions

```
src/
  app/
    (public)/       ← marketing pages
    (app)/          ← authenticated candidate-facing routes
    admin/          ← Lauren's admin console
    employer/       ← recruiter/agency portal (DORMANT)
    actions/        ← server actions — all mutations live here
    api/            ← route handlers (inngest, stripe, webhooks, og, health)
  components/
    ui/             ← shadcn primitives only. Don't modify these.
    [feature]/      ← feature-specific components
  lib/
    supabase/       ← client helpers (client / server / service / anon)
    llm/            ← all LLM logic
    assessment/     ← assessment content + scoring
    dashboard/      ← nudges, signals, prescription rules
  inngest/
    functions/      ← one file per Inngest function
  types/
    db.ts               ← hand-written aliases. Import from HERE.
    database.types.ts   ← generated. never hand-edit, never import directly.
```

- Page = `page.tsx` (server component, data fetching)
- Client interactivity = `[route]-client.tsx` (client component, receives data as props)
- Keep client components lean — data fetching happens in the server component or server action

---

## TypeScript

- **No `any`.** If you're tempted, there's a better way — ask.
- Use types from `src/types/db.ts` for all DB row shapes. **Never** write
  `Database["public"]["Tables"][...]` or `Database["public"]["Enums"][...]` inline —
  add the alias to `db.ts` and import it from there
- Prefer explicit return types on server actions and utility functions
- Don't suppress TS errors with `// @ts-ignore` — fix the type

---

## What to Do When You're Unsure

| Situation                               | Action                                          |
| --------------------------------------- | ----------------------------------------------- |
| Task touches auth, payments, or Inngest | Talk to GT before writing code                  |
| You need a new table or column          | Write the migration spec, get GT's review first |
| Existing code looks wrong               | Ask before refactoring — it may be intentional  |
| You broke something                     | Tell GT immediately. Don't hide it.             |
| PR feedback says "revert this"          | Revert it. Don't argue in the PR thread.        |

---

## PR Checklist

Before opening a PR to `main`:

- [ ] `npm run type-check` passes
- [ ] `npm run check` passes (ESLint + Prettier — this is what CI runs)
- [ ] `npm run build` succeeds
- [ ] No `console.log` left in production paths
- [ ] No hardcoded secrets or API keys
- [ ] New tables have RLS policies
- [ ] `database.types.ts` regenerated if schema changed, and any new enum or row
      type exposed through `src/types/db.ts`
- [ ] New env vars added to **both** `env.ts` and `.env.local.example`
- [ ] PR description explains _what_ changed and _why_

---

## Things That Will Get Your PR Rejected Immediately

- Touching `main` directly
- Editing `src/types/database.types.ts` by hand
- Installing a new npm package without flagging it in the PR description
- Adding client-side Supabase service-role usage
- Removing or weakening an RLS policy
- Changing the Inngest concurrency limit
- Refactoring code outside your task scope
- Importing `src/types/database.types.ts` directly instead of `src/types/db.ts`
- Adding a subscription or plan-based entitlement gate
- Deleting dormant job-board / employer / matching code

---

## Env Variables

```bash
cp .env.local.example .env.local
```

**Never commit `.env.local`.** `.env.local.example` documents every variable, where
to get it, and what breaks when it's unset. The Zod schema in `env.ts` is the
authority — a new variable must be added there _and_ to the example file.

Ask GT for the values and for invites to the vendor dashboards.

---

## Contact

**GT (Thrilok)** — architecture, schema, Inngest, Stripe, anything cross-cutting  
**Lauren** — product decisions, job content, admin operations

When in doubt, over-communicate. A Slack message costs nothing. An uncoordinated schema change costs a rollback window and a prod incident.
