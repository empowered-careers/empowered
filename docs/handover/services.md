# Third-party services

Every external service the platform depends on: what it does here, which files
touch it, what to set up, how to verify, and how it fails.

**You will need invites.** Ask GT for access to each dashboard — credentials are not
in this repo and never should be. Every variable named below is documented in
[`.env.local.example`](../../.env.local.example) and validated by
[`env.ts`](../../env.ts).

## The posture: optional and inert

Only Supabase is required for the app to boot. Every other integration degrades
quietly when its variable is unset:

| Unset                     | Consequence                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY`       | Parse/score runs fail at `getAnthropic()`                          |
| `INNGEST_*`               | Nothing, in local dev. In production, jobs never run               |
| `STRIPE_SECRET_KEY`       | Checkout and portal routes return 503                              |
| `STRIPE_WEBHOOK_SECRET`   | Webhook route 503s → **no payments or enrollments recorded**       |
| `LOOPS_API_KEY`           | Lifecycle event firing is a no-op                                  |
| `CALENDLY_WEBHOOK_SECRET` | Webhook route 503s → bookings not recorded                         |
| `PURCHASE_GATE_ENABLED`   | Gate is fully inert; nobody is ever gated                          |
| `BETA_INVITE_CODE`        | No redemption path at all; `/invite` shows only the purchase route |

This is deliberate, so the app runs locally without every vendor provisioned. Don't
"fix" it by making them required in `env.ts`.

---

## At a glance

| Service                                         | Status             | Required for        |
| ----------------------------------------------- | ------------------ | ------------------- |
| [Supabase](#supabase)                           | ✅ Live            | Everything          |
| [Vercel](#vercel)                               | ✅ Live            | Hosting             |
| [Inngest](#inngest)                             | ✅ Live            | All background jobs |
| [Anthropic](#anthropic)                         | ✅ Live            | Parsing + scoring   |
| [Stripe](#stripe)                               | ⚠️ Live, unproven  | Revenue             |
| [Loops](#loops)                                 | 🔨 Wired, not live | Lifecycle email     |
| [Calendly](#calendly)                           | 🔨 Wired, blocked  | Coaching bookings   |
| [Cal.com](#calcom)                              | 💤 Dormant         | Nothing             |
| [GitHub Actions](#github-actions)               | ✅ Live            | CI                  |
| [Google Search Console](#google-search-console) | ⏳ Pending         | SEO verification    |

---

## Supabase

**What it does here:** everything persistent. PostgreSQL (28 tables), Auth (email +
Google + LinkedIn OAuth), Storage (two buckets), Realtime (background-job
notifications), and Row Level Security — which is the actual authorization model, not
a nice-to-have.

- **Dashboard:** https://supabase.com/dashboard/project/wpurdayfjsyiedabmipt
- **Project ref:** `wpurdayfjsyiedabmipt`
- **Keys:** Project Settings → API Keys

### Variables

| Variable                               | Notes                                                  |
| -------------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Required to boot                                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Required to boot. Browser-safe — RLS protects the data |
| `SUPABASE_SECRET_KEY`                  | **Bypasses RLS.** Server-only. Inngest workers use it  |
| `NEXT_PUBLIC_SUPABASE_PROJECT_ID`      | CLI convenience, not read by `env.ts`                  |

This project uses the **publishable/secret** key naming, not the legacy
`anon`/`service_role`. See [`MIGRATION.md`](../../MIGRATION.md).

### Code

| Client                           | Use in                                           |
| -------------------------------- | ------------------------------------------------ |
| `src/lib/supabase/client.ts`     | Client Components, hooks (browser)               |
| `src/lib/supabase/server.ts`     | Server Components, Server Actions, handlers      |
| `src/lib/supabase/service.ts`    | **Secret key — bypasses RLS.** Never client-side |
| `src/lib/supabase/anon.ts`       | Unauthenticated public reads                     |
| `src/lib/supabase/middleware.ts` | Session refresh in `src/proxy.ts`                |

Storage buckets: `resumes`, `linkedin-exports`.

### Setup

1. Get invited to the project.
2. Install the CLI (already a devDependency) and link: `npx supabase link --project-ref wpurdayfjsyiedabmipt`
3. Migrations live in `supabase/migrations/`, applied via `npx supabase db push`.
4. After **any** schema change: `npm run supabase:types`, then expose new enums/rows
   through `src/types/db.ts`.

### Verify

`npm run dev`, sign in, reach `/dashboard`. If auth works, the keys are right.

### Failure modes

- **RLS silently rejects writes.** A policy-blocked insert returns success-shaped
  empty data, not an error. If a write "works" but no row appears, suspect RLS first.
  This exact bug shipped once — admin coaching writes were silently dropped.
- **Never edit an applied migration.** Write a new one.

---

## Vercel

**What it does here:** hosting, preview deploys, and Web Analytics (`@vercel/analytics`
mounted in `src/app/layout.tsx`).

- **Dashboard:** https://vercel.com/dashboard
- **Current deployment:** https://empowered-orcin.vercel.app
- Deploys on merge to `main`.

### The environment-parity trap

**Every server-side variable must be set in Vercel, not just `.env.local`.** Inngest
Cloud runs the background workers by calling the Vercel function — so a local-only
`ANTHROPIC_API_KEY` or `SUPABASE_SECRET_KEY` means every production parse and score
fails, while local dev looks perfectly healthy.

Checklist for the deploy host:

- [ ] `ANTHROPIC_API_KEY`
- [ ] `SUPABASE_SECRET_KEY`
- [ ] `INNGEST_EVENT_KEY` **and** `INNGEST_SIGNING_KEY` (two different keys)
- [ ] `NEXT_PUBLIC_SITE_URL` = the real domain — Stripe Checkout builds its
      success/cancel URLs from this, so a wrong value sends paying customers to
      `localhost`
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## Inngest

**What it does here:** all asynchronous work. Four functions, all in
`src/inngest/functions/`:

| Function         | Trigger             | Does                                                        |
| ---------------- | ------------------- | ----------------------------------------------------------- |
| `parse-resume`   | `resume/uploaded`   | PDF → Claude parse → Claude score → write back to `resumes` |
| `parse-linkedin` | `linkedin/uploaded` | Same shape for LinkedIn PDF exports                         |
| `match-jd`       | `jd/submitted`      | Scores a pasted job description against the resume          |
| `sweep-inactive` | cron `0 7 * * *`    | Fires 7-day and 30-day inactivity events to Loops           |

- **Dashboard:** https://app.inngest.com
- **App id:** `empowered-careers` (set in `src/inngest/client.ts`)
- **Serve endpoint:** `src/app/api/inngest/route.ts`
- **Event schemas:** typed with Zod in `src/inngest/client.ts`

### Variables

`INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`, from the app's Manage → Keys page.

**Local dev needs neither.** `npm run dev` sets `INNGEST_DEV=1`, pointing the client at
the local dev server.

They are two different keys with two different jobs:

- **Signing key** — Inngest Cloud proving it may invoke your endpoint.
- **Event key** — your app proving it may send events.

Having only the signing key is a real and confusing failure: the endpoint syncs green,
but `inngest.send()` throws and `submitJd` records `inngest_send_failed` (which
surfaces as a retry button, not a silent hang).

### Setup

**Local:**

```bash
npm run inngest:dev   # Terminal 1 — GUI at http://localhost:8288
npm run dev           # Terminal 2
```

**Production — after every deploy that adds or changes a function:**

```bash
curl -X PUT https://<your-domain>/api/inngest
# → {"message":"Successfully registered","modified":true}
```

This is the single most-forgotten operational step in the project.

### Conventions

- Async work goes through Inngest. **Do not create raw API routes for long-running
  work.**
- Register new functions in the `serve({ functions: [...] })` array in
  `src/app/api/inngest/route.ts`.
- Concurrency is capped at `{ limit: 5 }` per function. Don't remove it — it's what
  keeps Anthropic rate limits and Supabase connections in bounds.
- Each function has an `onFailure` handler that flips the domain row to
  `status: 'failed'` with the error. Keep that when you add functions.
- Use `NonRetriableError` for "this will never succeed" (row missing, bad input) so
  Inngest doesn't burn retries.

---

## Anthropic

**What it does here:** resume and LinkedIn parsing, ATS/profile scoring, JD matching,
and Big Wins bullet rewriting. All LLM logic lives in `src/lib/llm/` — **never call
the API directly from a component or action.**

- **Dashboard:** https://console.anthropic.com
- **Key:** Settings → API Keys

### Variables

| Variable                  | Default                     | Notes                        |
| ------------------------- | --------------------------- | ---------------------------- |
| `ANTHROPIC_API_KEY`       | —                           | Server-only. Required        |
| `ANTHROPIC_PARSER_MODEL`  | `claude-haiku-4-5-20251001` | Cheap model for extraction   |
| `ANTHROPIC_SCORER_MODEL`  | `claude-sonnet-4-6`         | Stronger model for judgement |
| `RESUME_PROMPT_VERSION`   | `1.1.0`                     | Stamped onto each row        |
| `LINKEDIN_PROMPT_VERSION` | `1.1.0`                     | Stamped onto each row        |

The prompt-version strings are stamped onto every parsed row, so you can tell which
prompt produced a given result. **Bump them whenever you change a prompt or the
rubric** — otherwise old and new results are indistinguishable in the data.

### Code

`src/lib/llm/` — `anthropic.ts` (client + model constants), `prompts.ts`,
`schemas.ts` (Zod validation of model output), `parse-resume.ts`,
`parse-linkedin.ts`, `match-jd.ts`, `polish-wins.ts`.

### Evals — run these before changing a prompt

```bash
npm run eval:scorers   # both scorer suites, offline replay, free
npm run eval:all       # adds parser suites (no-op without local PDF fixtures)
```

Suites gate on rubric pass rate ≥ 0.95, pairwise accuracy ≥ 0.85, label agreement
≥ 0.80, and exit non-zero on failure. Three modes: `--replay` (default, offline,
free), `--record` (calls the model, overwrites recordings), `--live` (calls the model,
writes nothing — catches drift).

Parser suites ship with no committed inputs on purpose: a realistic resume PDF is
somebody's actual resume, and that PII doesn't belong in the repo. Bring your own
local fixtures. See [`evals/README.md`](../../evals/README.md).

**`--record` and `--live` cost money.**

---

## Stripe

**What it does here:** one-time à la carte purchases of coaching sessions, courses, and
bundles. **Not subscriptions** — the subscription code is dormant (see
[`dormant-surfaces.md`](dormant-surfaces.md)).

- **Dashboard:** https://dashboard.stripe.com
- **Keys:** Developers → API keys
- **Webhooks:** Developers → Webhooks

### ⚠️ The money path has never completed end to end

As of the last audit, `payments` and `enrollments` were both **0 rows**. No à la carte
checkout has ever run to completion in any environment. Treat the whole path as
unverified until you run one with `4242 4242 4242 4242`. This is the highest-priority
item in [`open-items.md`](open-items.md).

### Variables

| Variable                             | Notes                                             |
| ------------------------------------ | ------------------------------------------------- |
| `STRIPE_SECRET_KEY`                  | `sk_test_…` locally                               |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` locally                               |
| `STRIPE_WEBHOOK_SECRET`              | `whsec_…`. **Without it, no revenue is recorded** |
| `STRIPE_PRICE_*` (4)                 | Dormant subscription tiers. Leave unset           |

### Code

| Path                                   | Role                                    |
| -------------------------------------- | --------------------------------------- |
| `src/app/api/stripe/checkout/route.ts` | Creates the Checkout Session            |
| `src/app/api/stripe/webhook/route.ts`  | Verifies signature, dedupes, dispatches |
| `src/app/api/stripe/portal/route.ts`   | Customer portal                         |
| `src/lib/stripe/client.ts`             | SDK client + `isStripeConfigured()`     |
| `src/lib/stripe/validate.ts`           | `assertAllowedPriceId()`                |
| `src/lib/stripe/webhook-handlers.ts`   | Per-event handlers                      |

### The catalog lives in Stripe, not in code

11 Products with one-time Prices exist in the Dashboard. Each price ID is pasted into
`coaching_products.stripe_price_id` via `/admin/coaching`. The full runbook is
[`docs/ec-catalog-setup.md`](../ec-catalog-setup.md).

### How a purchase becomes an entitlement

1. Client POSTs `{ priceId }` to `/api/stripe/checkout`.
2. The route **validates the price server-side** via `assertAllowedPriceId()` and
   derives `subscription` vs `one_time` from it — a client cannot force the mode or
   pay an arbitrary price.
3. A Stripe customer is created if needed and cached on `profiles.stripe_customer_id`.
4. On payment, Stripe calls `/api/stripe/webhook`.
5. The route verifies the signature, **records the event in `stripe_webhook_events`
   and short-circuits if already processed** (Stripe redelivers), then dispatches.
6. `handleCheckoutCompleted` inserts a `payments` row and upserts `enrollments`.
7. A bundle purchase grants its own enrollment **plus** one per product in
   `bundle_contents`, upserted with `ignoreDuplicates` so redelivery is a no-op and a
   partial overlap still grants the rest.
8. `enrollments` is the entitlement source of truth — the purchase gate and every
   feature check read from it.

Handler errors return 5xx **on purpose**, so Stripe retries; the error is stored on
the `stripe_webhook_events` row.

### Setup

**Local:**

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# copy the whsec_… it prints into STRIPE_WEBHOOK_SECRET
```

**Production:** create a webhook endpoint at `https://<domain>/api/stripe/webhook`
subscribed to `checkout.session.completed`, `customer.subscription.*`,
`invoice.payment_succeeded`, `invoice.payment_failed`.

### Verify

Buy something with `4242 4242 4242 4242`. Then check: a `payments` row, an
`enrollments` row, and a `stripe_webhook_events` row with `processed_at` set.

### The purchase gate

`PURCHASE_GATE_ENABLED=true` requires a signed-in candidate to hold an enrollment
before the app opens. Anything else — including unset — is fully inert.

Entitlement is read from `enrollments`, **never from user metadata**, which the
browser session can write itself. Admins always bypass. Logic in
`src/lib/purchase-gate.ts`, enforced in `src/app/(app)/layout.tsx`, with `/invite` as
the landing page for gated users.

Run the self-check: `npx tsx src/lib/purchase-gate.check.ts`

### The private beta invite code

`BETA_INVITE_CODE` (e.g. `ECTEST100`). There are **two ways a tester gets in**, and
both end at the same place — a row in `enrollments`:

1. **Enter the code at `/invite`.** `redeemInviteCode()`
   (`src/app/actions/invite.ts`) grants a comp **"Beta Access"** enrollment.
2. **Run real Stripe checkout** using the same string as a 100%-off promotion code.
   That produces a completed session, and the webhook grants the enrollment.

Details worth knowing:

- Redemption writes on the **service-role client**. After migration
  `20260903000000`, candidates have no INSERT policy on `enrollments` — so
  entitlement can only be granted by server code that checked something first: the
  code here, or a completed payment in the webhook. `enrollments` stays the single
  entitlement source.
- `matchesInviteCode()` is case- and whitespace-insensitive (testers paste it out of
  an email) and **never matches when `BETA_INVITE_CODE` is unset or blank**, so a
  blank form can't unlock anything. Covered in `purchase-gate.check.ts`.
- Migration `20260903010000_beta_access_product.sql` seeds the "Beta Access" product,
  because `enrollments.product_id` is `NOT NULL` and redemption needs something to
  enroll in. It's `is_active = false`, which keeps it out of `/pricing`, the catalog,
  and dashboard signals — all of which filter on that flag.
- `/invite` hides the form when no code is configured and falls back to the purchase
  route.

---

## Loops

**What it does here:** transactional and lifecycle email.

- **Dashboard:** https://app.loops.so
- **Key:** Settings → API
- **Variable:** `LOOPS_API_KEY`
- **Code:** `src/lib/loops/client.ts`

### 🔨 Wired, not live

The app already fires these events from Server Actions and Inngest functions:

`lead.registered` · `lead.attended` · `lead.converted` · `candidate.signup` ·
`candidate.payment` · `candidate.plan_upgraded` · `candidate.resume_uploaded` ·
`candidate.course_purchased` · `candidate.session_booked` ·
`candidate.enrollment_completed` · `assessment.started` · `assessment.completed` ·
`candidate.inactive_7d` · `candidate.inactive_30d`

**No sequences exist in Loops to receive them, so nothing sends.** Creating those
sequences is an ops task, not an engineering one. When `LOOPS_API_KEY` is unset the
firing is a no-op, so local registration works fine without it.

See [`docs/ec-admin-operations.md`](../ec-admin-operations.md) for the event payloads.

---

## Calendly

**What it does here:** candidates book coaching sessions; the webhook records them into
`coaching_sessions`.

- **Dashboard:** https://calendly.com/integrations/api_webhooks
- **Variable:** `CALENDLY_WEBHOOK_SECRET`
- **Code:** `src/lib/calendly.ts`, `src/app/api/calendly/webhook/route.ts`

### 🔨 Blocked on one variable

`CALENDLY_WEBHOOK_SECRET` has never been set, so the route returns 503 and **no
booking has ever been recorded.** Booking URLs are set on all 8 session products, so
candidates can book — the platform just doesn't know about it.

### The non-obvious design

All session products deliberately **share a single Calendly event type**. Bookings are
matched to enrollments on the `utm_content` query parameter — which carries the
enrollment id, appended in `my-coaching-client.tsx` — **not** on the event slug. So
duplicate booking URLs across products are correct, not a bug.

### Setup

Subscribe a webhook to `invitee.created`, `invitee.rescheduled`, `invitee.canceled`
pointing at `https://<domain>/api/calendly/webhook`. Put the signing key in
`CALENDLY_WEBHOOK_SECRET` locally and in Vercel.

### Verify

Book a test session, then confirm a `coaching_sessions` row appears with the right
`enrollment_id`. Self-check: `npx tsx src/lib/calendly.check.ts`

---

## Cal.com

💤 **Dormant.** `src/lib/cal.ts` and `src/app/api/cal/webhook/route.ts` are a
complete, unused twin of the Calendly integration, gated behind `CAL_WEBHOOK_SECRET`.
There is no Cal.com account behind it. It exists as a swap-in alternative. Leave it
alone; don't build on it.

---

## GitHub Actions

- **Workflows:** `.github/workflows/ci.yml`, `.github/workflows/notify.yml`
- **CI runs on** push and PR to `main`: `npm run type-check` → `npm run check` →
  `npm run build`, on Node 20.11.0.
- The build step uses placeholder Supabase values, so CI needs no real secrets.
- The final "Self-checks" step runs `npm test`, which executes all ten
  `assert`-based `.check.ts` files. A failed assertion fails the build.

---

## Google Search Console

⏳ **Pending.** `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` is unset. When set, the token is
emitted as a meta tag from `src/app/layout.tsx`.

- **Dashboard:** https://search.google.com/search-console
- To do: get the token, set it on the deploy host, verify the site, submit
  `/sitemap.xml`.

`/sitemap.xml`, `/robots.txt`, `/llms.txt`, and `/manifest.webmanifest` are all
generated and derive their URLs from `NEXT_PUBLIC_SITE_URL`.

---

## n8n

GT-managed automation, self-hosted on Hetzner. **No code in this repo** and nothing in
the app depends on it. Ask GT if you need to know what runs there.

---

## Onboarding checklist for a new developer

- [ ] Supabase — project invite
- [ ] Vercel — team invite
- [ ] Inngest — app invite
- [ ] Anthropic — Console invite or your own key
- [ ] Stripe — Dashboard invite (test mode is enough to start)
- [ ] Loops — invite (only if you're building the sequences)
- [ ] Calendly — invite (only if you're wiring the webhook)
- [ ] GitHub — repo access
- [ ] `cp .env.local.example .env.local` and fill in what you were given
- [ ] Walk [`local-setup.md`](local-setup.md) end to end
