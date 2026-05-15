# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Empowered Careers is a closed-loop SaaS talent network for mid-to-senior tech professionals. The platform assesses, scores, and matches candidates to exclusive roles that don't appear on public job boards. Revenue comes from candidate coaching/services and B2B placement fees. Any payment unlocks lifetime private job board access.

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

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Optional:
```
SUPABASE_SECRET_KEY=        # Server-side only
NEXT_PUBLIC_APP_URL=
```

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

Template:

```tsx
// app/<route>/page.tsx — Server Component
export const metadata = {
  title: '... | Empowered Careers',
  robots: 'noindex, nofollow', // defense in depth, even though auth-gated
};

export default async function Page() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single();

  return <PageClient profile={profile} /* ...initialData */ />;
}
```

```tsx
// components/<route>/page-client.tsx — Client Component
'use client';
export function PageClient({ profile }) {
  // state, handlers, TanStack Query, Realtime subscriptions, modals
}
```

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

13 tables in Supabase (types auto-generated in `src/types/database.types.ts`):

- `profiles` — core user record, keyed by Supabase auth UUID. Holds subscription tier/status, LinkedIn/Google provider IDs, Stripe customer ID.
- `resumes` — one-to-many per profile. Stores raw file URL, parsed text/JSON, ATS score.
- `linkedin_profiles` — synced LinkedIn data (headline, summary, profile score, raw JSON).
- `assessments` / `assessment_responses` — multi-step candidate assessments (8-9 dimensions: mindset, strengths, values, leadership, big wins).
- `candidate_scores` — aggregate scoring from assessments.
- `employers` / `jobs` / `job_scores` — employer records, exclusive job postings, job match scores.
- `matches` — candidate ↔ job matches produced by the matching algorithm.
- `payments` — payment records; any payment grants lifetime job board access.

RLS is enforced at the database level. When writing queries, don't assume the server client bypasses RLS unless using the secret key.

## Code Style Rules

These are enforced by the linter (`.rules` / Ultracite config):

- Use `for...of` instead of `Array.forEach`
- Use arrow functions instead of function expressions
- Use `Date.now()` instead of `new Date().getTime()`
- Use `.flatMap()` instead of `.map().flat()`
- No `parseInt()` when binary/octal/hex literals work
- No positive `tabIndex` values
- All `<button>` elements must have a `type` attribute
- `onClick` handlers must be accompanied by a keyboard handler (`onKeyUp`/`onKeyDown`/`onKeyPress`)
- SVG elements require a `<title>` child
- `<img>` alt text must not contain "image", "picture", or "photo"

## Key File Locations

| Purpose | Path |
|---|---|
| Root layout + providers | `src/app/layout.tsx` |
| Auth state + hook | `src/components/providers/auth-provider.tsx` |
| Dashboard server component | `src/app/dashboard/page.tsx` |
| Dashboard client component | `src/components/dashboard/dashboard-client.tsx` |
| Server Actions | `src/app/actions/` |
| Supabase browser client | `src/lib/supabase/client.ts` |
| Supabase server client | `src/lib/supabase/server.ts` |
| TanStack Query keys | `src/lib/query-keys.ts` |
| DB types (auto-generated) | `src/types/database.types.ts` |
| Env validation schema | `env.ts` |
| Site metadata/branding | `src/config/site.ts` |
| Business/product context | `docs/context.md` |
| Database schema + enums | `docs/db_schema.md` |
| Feature list + build status | `docs/ec-feature-list.md` |
| Sprint plan (what's built vs. deferred) | `docs/ec-sprint-plan.md` |
| Candidate journey + tier access rules | `docs/ec-candidate-journey.md` |
| Admin operations + Loops email events | `docs/ec-admin-operations.md` |
