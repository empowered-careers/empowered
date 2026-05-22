-- Leads — webinar/event registrants who haven't (yet) signed up for the platform.
--
-- Written by the /api/events/register route (service-role bypass), updated by
-- admin (mark-as-attended) and the OAuth callback (mark-as-converted). RLS
-- denies reads to candidates — they don't need to see their own lead row.

create table leads (
  id                   uuid primary key default gen_random_uuid(),
  email                text not null,
  full_name            text,

  -- acquisition
  source               text not null,
  source_ref           text,
  event_id             uuid references events(id) on delete set null,

  -- funnel state
  registered_at        timestamptz not null default now(),
  attended_at          timestamptz,

  -- conversion
  converted_profile_id uuid references profiles(id) on delete set null,
  converted_at         timestamptz,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  unique (email, event_id)
);

create index leads_email_idx on leads(email);
create index leads_event_id_idx on leads(event_id) where event_id is not null;
create index leads_converted_profile_idx on leads(converted_profile_id) where converted_profile_id is not null;
create index leads_registered_at_idx on leads(registered_at desc);

alter table leads enable row level security;

-- Service-role writes (from /api/events/register) bypass RLS. Admin reads + updates.
create policy leads_admin_read on leads for select to authenticated
  using (is_admin());

create policy leads_admin_update on leads for update to authenticated
  using (is_admin()) with check (is_admin());

create policy leads_admin_insert on leads for insert to authenticated
  with check (is_admin());

create policy leads_admin_delete on leads for delete to authenticated
  using (is_admin());
