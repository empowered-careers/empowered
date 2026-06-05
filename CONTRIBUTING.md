# Empowered Careers — Contributor Guide

> Read this before you touch anything. Seriously.

---

## The One Rule

**If it's not in your assigned sprint task, don't touch it.**

This codebase has paying users (soon). Every uncoordinated change to shared infrastructure — schema, auth, Inngest functions, RLS policies, shared components — creates bugs that are hard to trace and expensive to fix. When in doubt, ask GT first.

---

## Stack at a Glance

| Layer           | Tool                            | Notes                                             |
| --------------- | ------------------------------- | ------------------------------------------------- |
| Frontend        | Next.js 14 + TypeScript + React | App Router only. No Pages Router.                 |
| Components      | shadcn/ui                       | Don't install other UI libraries without approval |
| Database        | Supabase (PostgreSQL)           | All queries go through the typed client           |
| Auth            | Supabase Auth                   | Google + LinkedIn OAuth. Do not touch auth flow.  |
| Background jobs | Inngest                         | No raw API routes for async work                  |
| Payments        | Stripe                          | Handled by GT only                                |
| Email           | Loops                           | Event-driven via Supabase webhooks                |
| Hosting         | Vercel Pro                      | Deploys on merge to `main`                        |
| Automation      | n8n (self-hosted on Hetzner)    | GT-managed                                        |

---

## Branching

```
main          ← production. Direct pushes are blocked.
dev           ← integration branch. Merge here first.
feature/S3-stripe-webhook     ← format: feature/[sprint]-[short-description]
fix/resume-upload-gate        ← format: fix/[short-description]
```

- **Never push directly to `main`.**
- Branch off `dev`, not `main`.
- One branch per task. Don't bundle unrelated changes.
- PRs require GT's review before merging to `dev`.

---

## Before You Start Any Task

1. Pull latest `dev` — `git pull origin dev`
2. Check `docs/todo.md` for what's actually assigned to you
3. Read the relevant section in `ec-dev-plan.md` for your sprint
4. If your task touches the database, read `db_schema.md` first
5. Ask GT if anything is unclear — 5 minutes of alignment saves hours of rollback

---

## Vocabulary — Get This Right

The codebase uses precise terms. Using the wrong one in code, comments, or PRs causes confusion.

| Term                | Meaning                                                          |
| ------------------- | ---------------------------------------------------------------- |
| **Plan**            | What a candidate buys: `free`, `plan_1`, `plan_2`, `plan_3`      |
| **Job Tier**        | Exclusivity level of a job posting: `tier_1`, `tier_2`, `tier_3` |
| **Billing cadence** | `one_time`, `monthly`, `annual`                                  |

Never say just "Tier 1" or "Tier 2" — always qualify as **Plan** or **Job Tier**.

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
- Register new functions in `src/inngest/index.ts`
- Concurrency is capped at 5 per function — don't remove that limit
- LLM calls live in `src/lib/llm/` — don't call the Anthropic API directly from components or actions

---

## Component & File Conventions

```
src/
  app/
    (app)/          ← authenticated candidate-facing routes
    (admin)/        ← Lauren's admin console
    (employer)/     ← recruiter/agency portal
  components/
    ui/             ← shadcn primitives only. Don't modify these.
    [feature]/      ← feature-specific components
  lib/
    supabase/       ← client helpers
    llm/            ← all LLM logic
    actions/        ← server actions (co-locate with feature when possible)
  inngest/
    functions/      ← one file per Inngest function
  types/
    database.types.ts   ← generated. never hand-edit.
```

- Page = `page.tsx` (server component, data fetching)
- Client interactivity = `[route]-client.tsx` (client component, receives data as props)
- Keep client components lean — data fetching happens in the server component or server action

---

## TypeScript

- **No `any`.** If you're tempted, there's a better way — ask.
- Use types from `src/types/database.types.ts` for all DB row shapes
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

Before opening a PR to `dev`:

- [ ] TypeScript compiles with no errors (`npm run build`)
- [ ] No `console.log` left in production paths
- [ ] No hardcoded secrets or API keys
- [ ] New tables have RLS policies
- [ ] `database.types.ts` regenerated if schema changed
- [ ] PR description explains _what_ changed and _why_
- [ ] Linked to the specific task in `docs/todo.md`

---

## Things That Will Get Your PR Rejected Immediately

- Touching `main` directly
- Editing `src/types/database.types.ts` by hand
- Installing a new npm package without flagging it in the PR description
- Adding client-side Supabase service-role usage
- Removing or weakening an RLS policy
- Changing the Inngest concurrency limit
- Refactoring code outside your task scope

---

## Env Variables

You need a `.env.local` file to run locally. **Never commit this file.**

Get the values from GT. Required keys:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
LOOPS_API_KEY
```

---

## Contact

**GT (Thrilok)** — architecture, schema, Inngest, Stripe, anything cross-cutting  
**Lauren** — product decisions, job content, admin operations

When in doubt, over-communicate. A Slack message costs nothing. An uncoordinated schema change costs a rollback window and a prod incident.
