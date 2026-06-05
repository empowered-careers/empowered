-- Stripe webhook idempotency log. Stripe redelivers events; we ack each
-- event_id exactly once (record-then-act, mark processed_at last).

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

-- Admin read for debugging. No insert/update policy — only the service-role
-- webhook handler writes (service role bypasses RLS).
create policy stripe_webhook_events_admin_read on stripe_webhook_events
  for select to authenticated
  using (is_admin());
