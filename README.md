# Empowered Careers

A coaching and content platform for mid-to-senior tech professionals. The platform
assesses and scores candidates, then sells them 1:1 coaching, courses, and à la carte
career services.

**Revenue is à la carte only — there are no subscriptions.** Courses and content are
the qualification and warming layer that feeds the money generator, which is 1:1
coaching.

> **New to this codebase?** Start with **[`docs/handover/`](docs/handover/)** — setup,
> architecture, third-party services, and what's still unfinished. Then read
> [`CLAUDE.md`](CLAUDE.md) for the working rules and
> [`CONTRIBUTING.md`](CONTRIBUTING.md) for the process.

---

## Three rules that override anything older you find in `docs/`

The platform pivoted from job-board-first to coaching-first in August 2026.
[`docs/ec-pivot-brief.md`](docs/ec-pivot-brief.md) is the direction;
[`docs/ec-pivot-plan.md`](docs/ec-pivot-plan.md) is the implementation.

1. **Dormant ≠ deleted.** The job board, matching, employer portal, and
   placements/commissions keep their schema, routes, and admin surfaces. They are
   unlinked from candidate nav, not removed. Don't build on them; don't delete them.
   See [`docs/handover/dormant-surfaces.md`](docs/handover/dormant-surfaces.md).
2. **No subscriptions.** `profiles.plan`, `plan_2`/`plan_3`, `comparePlans()`, and
   `can_see_job_tier()` are **frozen, not extended**. New entitlements route through
   the `enrollments` table. Never add a plan-based gate.
3. **Intake stays mandatory.** The resume-upload hard gate before dashboard access
   stays exactly as-is even with no job board behind it — building the candidate list
   is the point.

---

## Stack

| Layer           | Technology                                          |
| --------------- | --------------------------------------------------- |
| Framework       | Next.js 16 (App Router) + React 19                  |
| Language        | TypeScript (strict)                                 |
| Styling         | Tailwind CSS v4 + shadcn/ui (new-york style)        |
| Database / Auth | Supabase (PostgreSQL, Auth, Storage, Realtime, RLS) |
| Server state    | TanStack Query v5                                   |
| Background jobs | Inngest                                             |
| LLM             | Anthropic Claude (resume/LinkedIn parsing, scoring) |
| Payments        | Stripe (one-time à la carte purchases)              |
| Lifecycle email | Loops _(wired, sequences not yet created)_          |
| Booking         | Calendly _(wired, webhook secret not yet set)_      |
| Hosting         | Vercel (+ Vercel Web Analytics)                     |
| Lint / format   | ESLint + Prettier (**not** Biome)                   |
| CI              | GitHub Actions                                      |

There are **no automated tests** in this codebase. Verification means type-check,
lint, the `evals/` suites for LLM output, and manual smoke tests. See
[`docs/handover/local-setup.md`](docs/handover/local-setup.md).

---

## Getting started

### Prerequisites

- **Node.js 20.11.0** (pinned in `.nvmrc` — `nvm use`)
- npm
- Accounts on the third-party services below. You will need invites — see
  [`docs/handover/services.md`](docs/handover/services.md).

### 1. Install

```bash
git clone <repo-url>
cd empowered
npm install
npm run prepare   # Husky git hooks
```

### 2. Environment

```bash
cp .env.local.example .env.local
```

Fill in the values. Every variable is documented in `.env.local.example` and validated
by the Zod schema in [`env.ts`](env.ts) at startup — a missing **required** var fails
the boot with a readable error.

Most integrations are **optional and inert when unset**: without `STRIPE_SECRET_KEY`
the app boots fine, Checkout just can't run. Without `LOOPS_API_KEY`, lifecycle events
are a no-op. This is deliberate — don't "fix" it by making them required.

Only these are genuinely required to boot:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

...but you also need `ANTHROPIC_API_KEY` and `SUPABASE_SECRET_KEY` for the resume
pipeline to do anything.

### 3. Run

Background jobs run through Inngest, which needs its own dev server. **Two terminals:**

```bash
# Terminal 1 — Inngest dev server (GUI at http://localhost:8288)
npm run inngest:dev

# Terminal 2 — Next.js (http://localhost:3000)
npm run dev
```

`npm run dev` sets `INNGEST_DEV=1`, which points the Inngest client at the local dev
server instead of Inngest Cloud. Without Terminal 1, resume uploads sit at
`status: 'processing'` forever.

### 4. Verify

Upload a PDF resume and watch the run go green in the Inngest GUI. The full smoke
test is in [`docs/handover/local-setup.md`](docs/handover/local-setup.md).

---

## Scripts

| Command                                                 | What it does                                         |
| ------------------------------------------------------- | ---------------------------------------------------- |
| `npm run dev`                                           | Dev server (Turbopack, `INNGEST_DEV=1`)              |
| `npm run inngest:dev`                                   | Inngest dev server — required for background jobs    |
| `npm run build`                                         | Production build                                     |
| `npm start`                                             | Serve the production build                           |
| `npm run type-check`                                    | `tsc --noEmit`                                       |
| `npm run lint`                                          | ESLint                                               |
| `npm run check`                                         | ESLint + Prettier check (what CI runs)               |
| `npm run fix`                                           | ESLint --fix + Prettier --write                      |
| `npm run format`                                        | Prettier only                                        |
| `npm run supabase:types`                                | Regenerate `src/types/database.types.ts` from schema |
| `npm run eval:all`                                      | All four LLM eval suites                             |
| `npm run eval:parser`                                   | Resume parser eval                                   |
| `npm run eval:scorer`                                   | Resume scorer eval                                   |
| `npm run eval:linkedin-parser` / `eval:linkedin-scorer` | LinkedIn equivalents                                 |

`npm run eval:*` calls the real Anthropic API and costs money.

---

## Project layout

```
src/
  app/
    (public)/       Marketing pages — home, pricing, about, events, blog, career-assessment
    (app)/          Authenticated candidate app — dashboard, resume, assessments, coaching
    admin/          Admin surfaces (role='admin')
    employer/       Employer portal — DORMANT
    actions/        Server Actions — all mutations live here
    api/            Route handlers — inngest, stripe, webhooks, og, health
  components/       Feature-grouped React components; ui/ is shadcn
  config/           Site metadata and branding
  hooks/            Client hooks, incl. Realtime notification hooks
  inngest/          Inngest client + 4 background functions
  lib/              Business logic: assessment, llm, stripe, supabase, dashboard, loops
  types/            db.ts (hand-written aliases) + database.types.ts (generated)
supabase/migrations/  SQL migrations
docs/               Product docs, plans, specs — see docs/README.md
docs/handover/      Start here if you're new
evals/              LLM output eval suites
```

### Two architectural rules worth knowing before your first PR

**Server/Client split on every authenticated route.** Even `noindex` pages use a
Server Component as the page entry (auth redirect + initial data fetch + metadata),
passing `initialData` to a Client Component that hydrates TanStack Query. No loading
spinner on first paint, no flash of protected content, and RLS works automatically.

**Never import `database.types.ts` directly.** Every enum alias, row type, and column
subset lives in `src/types/db.ts`. Add it there and import from there.

Both are explained in [`docs/handover/architecture.md`](docs/handover/architecture.md).

---

## Database

Supabase PostgreSQL, 28 tables, RLS enforced at the database level. Migrations in
`supabase/migrations/`, applied via the Supabase CLI.

After any schema change:

```bash
npm run supabase:types
```

Schema reference: [`docs/db_schema.md`](docs/db_schema.md). Live-vs-dormant table map:
[`docs/handover/data-model.md`](docs/handover/data-model.md).

---

## Deployment

Vercel, deploying on merge to `main`. CI (`.github/workflows/ci.yml`) runs type-check,
lint + format check, and build on every push and PR.

**After any deploy that adds or changes an Inngest function, re-sync the endpoint:**

```bash
curl -X PUT https://<your-domain>/api/inngest
```

Environment variables must be set in Vercel, not just `.env.local`. Inngest Cloud runs
the workers by calling the Vercel function, so a local-only `ANTHROPIC_API_KEY` means
every production parse and score fails. Full checklist:
[`docs/handover/services.md`](docs/handover/services.md).

---

## Documentation map

| Doc                                                          | What it's for                                 |
| ------------------------------------------------------------ | --------------------------------------------- |
| [`docs/handover/`](docs/handover/)                           | **Start here** — onboarding, services, setup  |
| [`CLAUDE.md`](CLAUDE.md)                                     | Working rules, architecture patterns          |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)                         | Branching, PR process, code standards         |
| [`docs/README.md`](docs/README.md)                           | Index of all product docs + what's superseded |
| [`docs/ec-pivot-brief.md`](docs/ec-pivot-brief.md)           | Current product direction                     |
| [`docs/ec-pivot-plan.md`](docs/ec-pivot-plan.md)             | Implementation state and build order          |
| [`docs/db_schema.md`](docs/db_schema.md)                     | Database schema and enums                     |
| [`docs/ec-catalog-setup.md`](docs/ec-catalog-setup.md)       | Ops runbook: Stripe products, coaches, Cal    |
| [`docs/ec-admin-operations.md`](docs/ec-admin-operations.md) | Admin operations + Loops email events         |
| [`docs/handover/open-items.md`](docs/handover/open-items.md) | What's unfinished, triaged                    |
| [`MIGRATION.md`](MIGRATION.md)                               | Supabase anon → publishable key migration     |

Older docs carry pivot banners marking which parts still hold. Read the banner before
trusting the doc.

---

## License

See [`LICENSE`](LICENSE).
