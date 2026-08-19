-- `cal_event_id` is the provider's booking id and both booking webhooks
-- (/api/cal/webhook, /api/calendly/webhook) look a row up by it with
-- `.maybeSingle()`, which errors outright once two rows share one id. Webhook
-- redelivery is routine — Calendly and Cal.com both retry on 5xx and support
-- manual replay — so without this the second delivery inserts a duplicate and
-- every delivery after that fails. Partial so the many rows with no provider
-- id (admin-created sessions) stay unconstrained.
create unique index if not exists coaching_sessions_cal_event_id_key
  on public.coaching_sessions (cal_event_id)
  where cal_event_id is not null;
