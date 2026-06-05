-- Extend payments for the Stripe webhook + tighten RLS to read-only.
--
-- Today payments only tracks stripe_payment_intent_id. The Stripe webhook
-- (à la carte one-time Checkout, later subscriptions) needs invoice /
-- subscription / price references plus a billing_reason and a metadata bag.
--
-- Also replaces the permissive FOR ALL self policy: authenticated users get
-- self-SELECT only; all writes are service-role (webhook) or admin. This is
-- the read-only gate the paywall plan's RLS section calls for.

alter table payments
  add column if not exists stripe_invoice_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists billing_reason text, -- 'subscription_create' | 'subscription_cycle' | 'one_time' | 'manual'
  add column if not exists metadata jsonb;

create index if not exists payments_stripe_subscription_idx
  on payments(stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists payments_profile_idx
  on payments(profile_id, created_at desc);

-- Idempotency: webhook may retry. One charge = one payment_intent.
create unique index if not exists payments_stripe_payment_intent_uq
  on payments(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- RLS: drop the permissive FOR ALL self policy, replace with read-only.
-- Writes happen only via the service-role webhook handler (bypasses RLS).
drop policy if exists "payments: own rows only" on payments;

create policy payments_self_read on payments for select to authenticated
  using (profile_id = auth.uid());

create policy payments_admin_read on payments for select to authenticated
  using (is_admin());
