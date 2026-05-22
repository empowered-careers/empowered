-- Events — public marketing acquisition layer.
--
-- Lauren (admin) creates events; the public /events listing reads them when
-- is_published = true. Used by the events-growth plan (docs/ec-events-growth-plan.md).
-- Depends on is_admin() from 20260520000000_role_enum.sql.

create type event_type as enum ('webinar', 'workshop', 'ama', 'masterclass');

create table events (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  title           text not null,
  subtitle        text,
  description     text,
  event_type      event_type not null default 'webinar',
  host_name       text not null default 'Lauren Laughlin',
  scheduled_at    timestamptz not null,
  duration_min    int not null default 60,
  replay_url      text,
  cover_image_url text,
  is_published    boolean not null default false,
  is_past         boolean not null default false,
  max_seats       int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index events_scheduled_at_idx on events(scheduled_at desc);
create index events_is_published_idx on events(is_published) where is_published = true;

alter table events enable row level security;

-- Public read of published events (no auth required — marketing surface).
create policy events_read_public on events for select to anon, authenticated
  using (is_published = true);

-- Admin full access.
create policy events_admin_all on events for all to authenticated
  using (is_admin()) with check (is_admin());
