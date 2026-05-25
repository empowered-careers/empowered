# Paywall & Plans (Plan)

> Created: 2026-05-23
> Status: Spec — Sprint 3 in `docs/ec-dev-plan.md`
> Related:
>
> - `docs/done/ec-job-board-plan.md` — already wires `can_see_job_tier(plan, job_tier)` SQL function + `src/lib/plan.ts` mirror. This plan flips `profiles.plan` so those gates start mattering.
> - `docs/done/ec-candidate-pipeline-plan.md` — Express Interest CTA currently doesn't paywall; this plan lets us add an upgrade nudge inside the consent modal.
> - `docs/done/ec-events-growth-plan.md` — `lead.converted` Loops event already fires at OAuth; this plan adds `candidate.payment` and `candidate.plan_upgraded` to the same event sink.
> - `docs/done/ec-admin-recruiters-plan.md` — independent; no employer-side payments in Phase 1.

## Context

The plan/billing-cadence schema, the `can_see_job_tier(plan, job_tier)` SQL helper, and the client-side mirror in `src/lib/plan.ts` all landed in S1. Job Board (S2) and Pipeline (S2) already enforce gating against `profiles.plan`. **Today every account is `plan = 'free'`** — nothing flips it, so Tier 2 and Tier 3 are functionally unreachable except by manual SQL.

S3 closes the loop: Stripe takes money, a webhook flips `profiles.plan` + writes a `payments` row, and the existing gates start doing their job. À la carte purchases (resume review, LinkedIn audit, interview prep, individual coaching sessions) reuse the same plumbing; they grant `plan_1` (the cheapest paid tier) on first purchase.

This is the next unblocked sprint — independent of the Anthropic API key, Lauren's manual seeding, and the recruiters portal currently being finished.

---

## Decisions to lock in

These are surfaced up front because they affect schema + pricing copy. **Defaults are picked but flag any disagreement before implementation.**

1. **Stripe surface: hosted Checkout for v1** (not Payment Element). One redirect per purchase, near-zero PCI scope, ~1 day to wire. Cost: brand jumps domain mid-flow. Acceptable for S3; revisit when à la carte volume justifies inline checkout.
2. **Plan ↔ purchase mapping**:
   - À la carte (any one-time service: resume review, LinkedIn audit, interview prep, single coaching session) → `plan = 'plan_1'`, `billing_cadence = 'one_time'` if currently `free`. Never downgrades.
   - Plan 2 monthly / annual subscription → `plan = 'plan_2'`, `billing_cadence = 'monthly'` / `'annual'`.
   - Plan 3 monthly / annual subscription → `plan = 'plan_3'`, same cadence rule.
   - **Upgrade is monotonic** (`plan_3 > plan_2 > plan_1 > free`). Buying a single coaching session doesn't downgrade a Plan 3 subscriber.
   - This matches the existing `can_see_job_tier` helper. `docs/context.md` and `docs/ec-candidate-journey.md` both say "any payment = Tier 3 access" — that's marketing aspiration; the actual gate today is `tier_3 ↔ plan_3`. **Lock the gate, fix the docs**, not the other way around.
3. **Subscription model**: stripe-native subscriptions for Plan 2 / Plan 3 (monthly + annual). Plan 1 is a one-time charge that grants lifetime entry-tier access — no recurring object, no renewal logic. The `subscription_status` enum on `profiles` only applies to plan_2/plan_3 rows; for plan_1 it stays null.
4. **Catalog source of truth**: Stripe Dashboard owns the product/price catalog. We store price IDs in two places:
   - **Subscription tiers (5 fixed prices)** — env vars (`STRIPE_PRICE_PLAN_1_ONE_TIME`, `STRIPE_PRICE_PLAN_2_MONTHLY`, `STRIPE_PRICE_PLAN_2_ANNUAL`, `STRIPE_PRICE_PLAN_3_MONTHLY`, `STRIPE_PRICE_PLAN_3_ANNUAL`). Validated in `env.ts`.
   - **À la carte services** — the existing `coaching_products.stripe_price_id` column. Lauren manages from `/admin/coaching` (already shipped via admin-super slice 3).
5. **Cancel UX**: Stripe Customer Portal (hosted) for v1. Same tradeoff as Checkout — fastest to ship, brand jumps domain. One link in `/billing`.
6. **What "à la carte" includes for the plan_1 grant**: every product in `coaching_products` (already includes resume_review, linkedin_review, interview_prep, coaching modules + session packs). Webinar registrations are a separate flow (`/api/events/register`) and do NOT grant plan upgrades — webinars stay top-of-funnel acquisition, not monetization.

---

## Schema additions

Most of what we need is already in place from S1. Two small migrations:

### Migration `<ts>_payments_extend.sql`

```sql
-- Today: payments table is minimal. Stripe webhook needs more.
alter table payments
  add column stripe_invoice_id text,
  add column stripe_subscription_id text,
  add column stripe_price_id text,
  add column billing_reason text, -- 'subscription_create' | 'subscription_cycle' | 'one_time' | 'manual'
  add column metadata jsonb;

create index payments_stripe_subscription_idx
  on payments(stripe_subscription_id)
  where stripe_subscription_id is not null;
create index payments_profile_idx on payments(profile_id, created_at desc);

-- Idempotency: webhook may retry. Stripe event id is unique per delivery,
-- payment_intent_id is unique per charge.
create unique index if not exists payments_stripe_payment_intent_uq
  on payments(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
```

### Migration `<ts>_stripe_webhook_events.sql`

```sql
-- Idempotency log. Stripe redelivers; we ack each event_id once.
create table stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb not null,
  processing_error text
);

create index stripe_webhook_events_type_idx on stripe_webhook_events(event_type);

alter table stripe_webhook_events enable row level security;
create policy stripe_webhook_events_admin_read on stripe_webhook_events for select to authenticated
  using (is_admin());
-- No insert/update policy — only the service-role webhook handler writes.
```

No changes to `profiles` (already has `plan`, `billing_cadence`, `subscription_status`, `stripe_customer_id`). No changes to `coaching_products` (already has `stripe_price_id` + `price_cents`). The `payments.product_type` enum already has the values we need (`subscription`, `resume_review`, `linkedin_review`, `interview_prep`, `webinar`).

---

## Routes

| Route                     | Purpose                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `/pricing`                | Public-facing plan table (Plan 1 one-time, Plan 2 monthly/annual, Plan 3 monthly/annual)      |
| `/(app)/billing`          | Authenticated: current plan, next renewal, manage-subscription link to Stripe Customer Portal |
| `/(app)/checkout/success` | Post-Checkout return URL — confirms payment, polls until webhook flips plan, then redirects   |
| `/(app)/checkout/cancel`  | Post-Checkout cancel return URL — preserves intent in URL so we can re-CTA                    |
| `/api/stripe/checkout`    | Server route handler: creates a Checkout Session for a given `price_id` or `product_id`       |
| `/api/stripe/portal`      | Server route handler: creates a Customer Portal session and redirects                         |
| `/api/stripe/webhook`     | Stripe webhook receiver. Service-role writer. Idempotent via `stripe_webhook_events`          |

`/pricing` is public (no auth) — same surface as `/events/[slug]`, lives outside the `(app)/` group. The Checkout button on `/pricing` redirects through `/login` first if unauthenticated so we capture the user before Stripe.

---

## Server actions + handlers

### `src/app/api/stripe/checkout/route.ts` (POST)

Inputs: `{ kind: 'subscription' | 'one_time', priceId: string }` from a form action on `/pricing` or `/job-board` lock banners.

- `requireUser()` (same shape as `requireAdmin()` / `requireEmployer()` — add to `src/lib/auth/require-role.ts`).
- Load profile. If no `stripe_customer_id`, create a Stripe customer (email + `metadata.profile_id`) and persist.
- Validate `priceId` against the env allowlist + active `coaching_products.stripe_price_id` values. Reject anything else (prevents arbitrary-price abuse).
- `stripe.checkout.sessions.create({ mode, customer, line_items, success_url, cancel_url, metadata: { profile_id, kind } })`.
- Return `{ url }`. Client redirects.

### `src/app/api/stripe/portal/route.ts` (POST)

- `requireUser()`, load `stripe_customer_id`.
- `stripe.billingPortal.sessions.create({ customer, return_url: '/billing' })`.
- Redirect to the portal URL.

### `src/app/api/stripe/webhook/route.ts` (POST)

Service-role Supabase client (`src/lib/supabase/service.ts`). Signature-verify via `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`.

Pseudocode:

```ts
// 1. Idempotency — bail early if already processed.
const { data: existing } = await supabase
  .from("stripe_webhook_events")
  .select("processed_at")
  .eq("event_id", event.id)
  .maybeSingle();
if (existing?.processed_at) return new Response("ok", { status: 200 });

await supabase.from("stripe_webhook_events").upsert({
  event_id: event.id,
  event_type: event.type,
  payload: event,
});

// 2. Dispatch.
try {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object);
      break;
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscriptionChange(event.data.object);
      break;
    case "invoice.payment_succeeded":
      await handleInvoicePaid(event.data.object);
      break;
    case "invoice.payment_failed":
      await handleInvoiceFailed(event.data.object);
      break;
    default:
    // log + ack; don't 4xx unknown events
  }
  await supabase
    .from("stripe_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("event_id", event.id);
} catch (err) {
  await supabase
    .from("stripe_webhook_events")
    .update({ processing_error: String(err) })
    .eq("event_id", event.id);
  // 5xx so Stripe retries
  return new Response("error", { status: 500 });
}
```

#### Handler logic

- **`handleCheckoutCompleted`**: read `metadata.profile_id` + `metadata.kind`. For `kind='one_time'`: write `payments` row, look up `coaching_products` by `stripe_price_id` to derive `product_type`, grant `enrollments` row if the product is a coaching module, and upgrade `plan='plan_1'`, `billing_cadence='one_time'` only if current plan is `free`. For `kind='subscription'`: defer plan flip to `customer.subscription.updated` (Stripe will fire it).
- **`handleSubscriptionChange`**: map `price_id` → target plan (env-driven lookup). Write/update `profiles.plan`, `billing_cadence`, `subscription_status`, `stripe_subscription_id`. On `deleted`, set `subscription_status='canceled'`. **Do not downgrade `plan` immediately** — Stripe gives a `cancel_at_period_end` flag; downgrade is handled when the period actually ends (next `subscription.deleted` event).
- **`handleInvoicePaid`**: write a `payments` row keyed by `invoice.id` (renewal record-keeping). `billing_reason = 'subscription_cycle'`.
- **`handleInvoiceFailed`**: set `subscription_status='expired'` after Stripe's retry window exhausts.

### Helpers in `src/lib/stripe/`

| File          | Purpose                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `client.ts`   | Server-only `Stripe` SDK instance. Reads `STRIPE_SECRET_KEY`.                                          |
| `prices.ts`   | Env-driven `priceIdToPlan` lookup — maps the 5 subscription price IDs to `{ plan, billing_cadence }`.  |
| `validate.ts` | `assertAllowedPriceId(supabase, priceId)` — checks against env allowlist + active `coaching_products`. |

### `src/lib/plan.ts` additions

- `comparePlans(a: Plan, b: Plan): -1 | 0 | 1` — encodes the `plan_3 > plan_2 > plan_1 > free` order. Webhook uses this to enforce monotonic upgrade.
- `requiredPlanForTier(tier: JobTier): Plan` — already exists as `tierRequiredPlan`; rename one usage for clarity.

---

## RLS

- `payments`: candidate self-read of own rows; admin reads all (already covered by `admin_rls` blanket if it includes `payments` — verify, otherwise add). No insert/update from authenticated; service role writes only.
- `stripe_webhook_events`: admin read for debugging; service-role write.

```sql
-- Add to <ts>_payments_extend.sql if not already in place:
create policy payments_self_read on payments for select to authenticated
  using (profile_id = auth.uid());
create policy payments_admin_read on payments for select to authenticated
  using (is_admin());
```

---

## Nudge / UI integration

- **`/job-board`** Tier 2 / Tier 3 lock banners (already shipped via job-board plan) link to `/pricing#plan_2` / `/pricing#plan_3` deeplinks. Add anchors to `/pricing`.
- **`/(app)/checkout/success`** polls `/api/me` (or the existing dashboard query) until `profiles.plan` updates, then routes to `/dashboard` with a success toast. Cap polling at 30s — if the webhook is lagging beyond that, surface "We received your payment, your account will update shortly" + a manual refresh button.
- **Dashboard nudges**: tie the existing nudge framework to `profiles.plan`. Free → upgrade prompts. Plan 1 → subscribe prompts. Plan 2 → upgrade to Plan 3 prompt when viewing Tier 3 lock banner.
- **`expressInterest` modal** (already shipped): when a free user clicks Express Interest on a Tier 2/3 role they can't see (shouldn't happen via RLS, but defensive), the consent modal swaps to a "subscribe to apply" CTA.

---

## Critical files to create / modify

### Create

| Path                                                  | Purpose                                                                             |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `supabase/migrations/<ts>_payments_extend.sql`        | Stripe-side columns on `payments` + indexes + self-read RLS                         |
| `supabase/migrations/<ts>_stripe_webhook_events.sql`  | Idempotency log table                                                               |
| `src/lib/stripe/client.ts`                            | Stripe SDK singleton                                                                |
| `src/lib/stripe/prices.ts`                            | `priceIdToPlan` + cadence lookup from env                                           |
| `src/lib/stripe/validate.ts`                          | `assertAllowedPriceId` allowlist check                                              |
| `src/lib/stripe/webhook-handlers.ts`                  | `handleCheckoutCompleted`, `handleSubscriptionChange`, `handleInvoicePaid`/`Failed` |
| `src/app/api/stripe/checkout/route.ts`                | Checkout Session creator                                                            |
| `src/app/api/stripe/portal/route.ts`                  | Customer Portal session creator                                                     |
| `src/app/api/stripe/webhook/route.ts`                 | Webhook receiver (service-role writes, signature-verified)                          |
| `src/app/pricing/page.tsx`                            | Public pricing page (server component; static-ish + a Checkout button per price)    |
| `src/app/(app)/billing/page.tsx`                      | Current plan + manage-subscription link                                             |
| `src/app/(app)/checkout/success/page.tsx`             | Post-Checkout confirmation + plan-poll                                              |
| `src/app/(app)/checkout/cancel/page.tsx`              | Post-Checkout cancel re-CTA                                                         |
| `src/components/pricing/plan-card.tsx`                | Reusable plan card (subscription + one-time variants)                               |
| `src/components/billing/manage-subscription-link.tsx` | Form-action button that POSTs to `/api/stripe/portal`                               |

### Modify

| Path                                                         | Change                                                                                                                                                            |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `env.ts`                                                     | Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, the 5 `STRIPE_PRICE_*` env vars                                           |
| `src/lib/plan.ts`                                            | Add `comparePlans()` for monotonic-upgrade enforcement                                                                                                            |
| `src/lib/auth/require-role.ts`                               | Add `requireUser()` (no role check, just authenticated)                                                                                                           |
| `src/lib/query-keys.ts`                                      | Add `queryKeys.billing.*` (current plan, payments history)                                                                                                        |
| `src/components/dashboard/profile-strength-card.tsx`         | Add a "Subscribe to unlock Tier 3" step if `plan !== 'plan_3'` AND profile is otherwise complete                                                                  |
| `src/components/job-board/tier-lock-banner.tsx` (or similar) | Deeplink CTAs to `/pricing#plan_2` / `/pricing#plan_3`                                                                                                            |
| `src/lib/loops/events.ts` (or wherever Loops events live)    | Emit `candidate.payment`, `candidate.plan_upgraded` from the webhook handlers                                                                                     |
| `src/types/database.types.ts`                                | Regenerate via `npm run supabase:types` after migrations                                                                                                          |
| `docs/db_schema.md`                                          | Document the new `payments` columns + `stripe_webhook_events` table                                                                                               |
| `docs/context.md` + `docs/ec-candidate-journey.md`           | Reword the "any payment = Tier 3 access" line to "any payment unlocks the private job board at your plan level; Plan 3 unlocks the Tier 3 exclusive roles bucket" |
| `docs/ec-feature-list.md` §10                                | Mark Stripe items shipped after sprint closes                                                                                                                     |
| `docs/ec-dev-plan.md`                                        | Move S3 line items into the progress snapshot once landed                                                                                                         |

---

## Patterns to reuse

- **Server-route handler pattern**: `src/app/api/events/register/route.ts` already uses the service-role client + signature-less external trust model. Webhook layers signature verification on top.
- **Idempotency log**: same shape as how Inngest dedupes — record-then-act, mark `processed_at` last.
- **Server/Client split**: `/pricing` is a server component (no auth) that renders `<PlanCard>` client components for the Checkout button form actions. `/billing` is server (auth + initial data) + client (manage button).
- **Server actions vs route handlers**: Stripe Checkout / Portal endpoints have to set redirect URLs Stripe will hit, so they're route handlers, not server actions. Webhook is a route handler by definition.
- **Auth shape**: `requireUser()` mirrors `requireAdmin()` / `requireEmployer()`; same import path.

---

## Sequencing

1. **Schema first** (migrations + env vars + types regen). No app code yet.
2. **Stripe Dashboard setup** (manual, by GT / Lauren): create 5 prices for plans, create webhook endpoint pointing at the prod webhook URL, copy IDs into env. Local dev uses `stripe listen --forward-to localhost:3000/api/stripe/webhook` and `STRIPE_WEBHOOK_SECRET` from the CLI output.
3. **Webhook receiver + handlers** (most important — build this before any Checkout UI so we can verify webhooks land correctly using Stripe's "Send test event" tool).
4. **Checkout + portal route handlers**.
5. **`/pricing` page** + `<PlanCard>` form actions. End-to-end test: card-test number → Checkout → webhook → profile flip → `/checkout/success` shows new plan.
6. **`/billing` page** + Customer Portal link.
7. **Job-board tier-lock CTA deeplinks** + dashboard upgrade nudge.
8. **Loops events** for `candidate.payment` + `candidate.plan_upgraded`.
9. **À la carte path**: hook up one `coaching_products` row (e.g. "Resume Review — $99") and verify one-time purchase → `plan_1` upgrade flow end-to-end.

---

## Verification

Manual (no automated tests in repo):

1. `npm run type-check` and `npm run check` clean after each migration.
2. **Subscription happy path**: as a free candidate, visit `/pricing`, click "Subscribe" on Plan 2 monthly. Stripe Checkout opens. Pay with `4242 4242 4242 4242`. Redirected to `/checkout/success`. Within 30s `profiles.plan` becomes `plan_2`, `billing_cadence='monthly'`, `subscription_status='active'`. `payments` has a row with `billing_reason='subscription_create'`. `/job-board` now shows Tier 2 roles unlocked; Tier 3 still locked.
3. **Upgrade**: same user clicks "Upgrade to Plan 3 (annual)". After Checkout, `plan='plan_3'`, `billing_cadence='annual'`. Tier 3 roles now visible.
4. **À la carte**: free candidate buys "Resume Review" (one-time). After Checkout, `payments` row written, `enrollments` row written for the coaching product, `plan='plan_1'`, `billing_cadence='one_time'`, `subscription_status` stays null.
5. **Monotonic upgrade**: a Plan 3 subscriber buys a one-time coaching session. Their plan stays `plan_3` (does not downgrade to `plan_1`).
6. **Cancel**: from `/billing`, click "Manage subscription" → Stripe Portal. Cancel at period end. `subscription_status='canceled'` immediately; `plan` stays `plan_3` until period end (verified by waiting for the `subscription.deleted` event or simulating it via Stripe CLI). After deletion, `plan='free'`, `billing_cadence=null`.
7. **Failed payment**: simulate `invoice.payment_failed` via Stripe CLI. `subscription_status` flips to `expired`. Dashboard surfaces a "Payment failed — update card" banner that links to the Customer Portal.
8. **Webhook idempotency**: replay the same `checkout.session.completed` event twice via Stripe CLI. Only one `payments` row exists. The second delivery returns 200 immediately without re-processing.
9. **Webhook security**: send a webhook with a bad signature → 400. Send without a signature → 400. Send to `/api/stripe/webhook` from a browser → 405 (POST-only).
10. **RLS adversarial**: as a candidate, attempt `select * from payments where profile_id != auth.uid()` via Supabase Studio with their JWT → blocked. Attempt `insert into payments` from authenticated → blocked.
11. **Loops events**: confirm `candidate.payment` and `candidate.plan_upgraded` events arrive in Loops after a successful Checkout (Loops Dashboard event log).
