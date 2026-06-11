-- Persistent notifications feed backing the top-nav bell.
--
-- Rows are written from privileged server contexts only (Inngest workers,
-- the Stripe webhook, and admin/candidate server actions via the service-role
-- client) at the moment a source row mutates. Candidates read and mark their
-- own rows read; no one inserts through RLS — only service_role writes.

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  type        text not null,          -- 'application_status' | 'resume_complete' | 'match_created' | 'linkedin_sync' | 'payment_succeeded' | 'assessment_complete'
  title       text not null,
  body        text,
  href        text,                   -- deep link, e.g. '/pipeline' or '/job-board?id=...'
  metadata    jsonb not null default '{}',
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_profile_recent_idx on notifications (profile_id, created_at desc);
create index notifications_profile_unread_idx on notifications (profile_id) where read_at is null;

alter table notifications enable row level security;

-- Read own rows only.
create policy notifications_read_self on notifications for select to authenticated
  using (profile_id = auth.uid());

-- Mark own rows read. with check keeps ownership intact on update.
create policy notifications_update_self on notifications for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- No insert/update policy for inserts — only the service-role writer creates
-- rows (service role bypasses RLS).

-- Realtime: the feed hook subscribes to INSERT only, so default replica
-- identity is sufficient (no REPLICA IDENTITY FULL needed).
alter publication supabase_realtime add table notifications;
