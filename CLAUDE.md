# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Empowered Careers is a closed-loop SaaS talent network for mid-to-senior tech professionals. The platform assesses, scores, and matches candidates to exclusive roles that don't appear on public job boards. Revenue comes from candidate coaching/services and B2B placement fees. Any payment unlocks lifetime private job board access.

## Working Principles

These bias toward caution over speed. Use judgment on trivial tasks.

### Think before coding

Don't assume. Don't hide confusion. Surface tradeoffs.

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity first

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Sanity check: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### Surgical changes

Touch only what you must. Clean up only your own mess.

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports/variables/functions that YOUR changes made unused. Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

### Goal-driven execution

Define success criteria. Loop until verified.

- "Add validation" → "Cover invalid inputs, then verify they're rejected."
- "Fix the bug" → "Reproduce it, then confirm the repro no longer fails."
- "Refactor X" → "Ensure behavior is unchanged before and after."

For multi-step tasks, state a brief plan with verification per step. Strong success criteria let you loop independently; weak ones ("make it work") force constant clarification.

> Note: this repo has no automated tests yet — verification often means manual checks (type-check, lint, dev server) or reasoning explicitly about behavior. State what you used to verify.

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run type-check   # TypeScript type check (no emit)
npm run lint         # ESLint only
npm run check        # ESLint + Prettier check
npm run fix          # ESLint fix + Prettier write
npm run format       # Prettier format only
npm run supabase:types  # Regenerate src/types/database.types.ts from schema
```

There are no automated tests in this codebase yet.

## Environment Variables

Required in `.env.local`
The Zod schema in `env.ts` validates all env vars at startup — add new ones there.

## Architecture

**Stack:** Next.js 15 App Router + React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui (new-york style), Supabase (auth + PostgreSQL + storage), TanStack Query v5.

### Data Flow Pattern

The app uses a split Server/Client Component pattern for the dashboard:

1. **Server Component** (`app/dashboard/page.tsx`) fetches data via the Supabase server client and passes it as `initialData` props to the client component. This eliminates loading spinners on initial render.
2. **Client Component** (`components/dashboard/dashboard-client.tsx`) receives `initialData`, hydrates TanStack Query cache, and handles subsequent refetches/mutations client-side.
3. **Server Actions** (`app/actions/`) handle all mutations (profile updates, resume uploads, LinkedIn sync). After a Server Action succeeds, invalidate the relevant TanStack Query keys.

#### Server/Client split — apply to ALL authenticated routes

"No SEO needed" does **not** mean "no Server Component." Even for `noindex` pages (dashboard, profile, resume, assessments, matches), use a Server Component as the page entry. Reasons:

- **Perf:** initial data ships with the HTML — no loading spinner on first paint.
- **Auth:** server-side `redirect('/login')` runs before render, so no flash of protected content.
- **RLS:** the server Supabase client carries the user's session automatically; RLS policies just work.

Rules:

- No DTO layer — pass Supabase row types straight through. Types come from `src/types/database.types.ts`.
- Server component: auth check + redirect, initial data fetch, metadata.
- Client component: state, events, TanStack Query (hydrated from initialData), Realtime hooks, modals.

### Async background jobs (Realtime notification pattern)

For any feature that processes work in the background (resume parsing, ATS scoring, matching, payment confirmations, future LinkedIn audits), follow this pattern. Don't invent a new shape per feature.

**Flow:**

1. Client triggers → server inserts row with `status: 'processing'` → toast 1 ("in progress").
2. Fire-and-forget POST to `/api/<job>` route. User can navigate away freely.
3. Background worker updates the row to `status: 'complete'` (plus result fields).
4. Supabase Realtime `postgres_changes` event fires.
5. A per-domain notification hook mounted in root layout catches the event → Sonner toast with action button → routes to the result page.

**Status enum on each domain table:** `'uploading' | 'processing' | 'complete' | 'failed'` (variants OK where domain demands).

**Hook naming + placement:**

- `useResumeNotifications`, `useAssessmentNotifications`, `useMatchNotifications`, `usePaymentNotifications`
- Live in `src/hooks/`
- Subscribe to `postgres_changes` filtered by `profile_id=eq.${userId}`
- Mounted once in a client wrapper inside root layout — survives navigation
- Clean up via `supabase.removeChannel(channel)` on unmount

**Why this shape:** Realtime (websocket) beats polling; layout-mounted hook survives navigation; Sonner queues toasts natively; identical scaffolding makes every new async feature predictable. After `status` flips to `complete`, invalidate the relevant TanStack Query key from `src/lib/query-keys.ts`.

### Supabase Clients

There are two Supabase clients — use the right one for the context:

- `src/lib/supabase/client.ts` — browser client (`createBrowserClient`), for Client Components and hooks
- `src/lib/supabase/server.ts` — server client (`createServerClient`), for Server Components, Server Actions, and Route Handlers

### Providers

Root layout wraps the app in four providers (in order): `ThemeProvider` → `QueryProvider` → `AuthProvider` → `ModalProvider`.

- **AuthProvider** (`components/providers/auth-provider.tsx`) — centralized auth state; exposes `useAuth()` hook with `user`, `session`, `signOut`, etc.
- **ModalProvider** — global modal system using shadcn `Dialog`; opens modals without prop drilling
- **QueryProvider** — TanStack Query config; DevTools included in dev

### Query Keys

All TanStack Query cache keys are defined in `src/lib/query-keys.ts`. Always use `queryKeys.*` from that file — never hardcode string arrays as query keys.

### Database Schema

All tables in Supabase (types auto-generated in `src/types/database.types.ts`)
RLS is enforced at the database level. When writing queries, don't assume the server client bypasses RLS unless using the secret key.

## Key File Locations

| Purpose                                 | Path                                            |
| --------------------------------------- | ----------------------------------------------- |
| Root layout + providers                 | `src/app/layout.tsx`                            |
| Auth state + hook                       | `src/components/providers/auth-provider.tsx`    |
| Dashboard server component              | `src/app/dashboard/page.tsx`                    |
| Dashboard client component              | `src/components/dashboard/dashboard-client.tsx` |
| Server Actions                          | `src/app/actions/`                              |
| Supabase browser client                 | `src/lib/supabase/client.ts`                    |
| Supabase server client                  | `src/lib/supabase/server.ts`                    |
| TanStack Query keys                     | `src/lib/query-keys.ts`                         |
| DB types (auto-generated)               | `src/types/database.types.ts`                   |
| Env validation schema                   | `env.ts`                                        |
| Site metadata/branding                  | `src/config/site.ts`                            |
| Business/product context                | `docs/context.md`                               |
| Database schema + enums                 | `docs/db_schema.md`                             |
| Feature list + build status             | `docs/ec-feature-list.md`                       |
| Sprint plan (what's built vs. deferred) | `docs/ec-sprint-plan.md`                        |
| Candidate journey + tier access rules   | `docs/ec-candidate-journey.md`                  |
| Admin operations + Loops email events   | `docs/ec-admin-operations.md`                   |
