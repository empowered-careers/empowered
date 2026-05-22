-- candidate_preferences: candidate-self job-seeking preferences captured
-- via the soft-gated onboarding step + a first-time prompt on Express
-- Interest. See docs/db_schema.md and the plan referenced in
-- docs/ec-dev-plan.md.
--
-- One row per profile. Self-RLS for read/write; admin overlay via is_admin()
-- so Lauren can see + update everything for outreach prioritization.

create type switch_urgency as enum (
  'actively_looking',
  'open',
  'passive',
  'not_looking'
);

create type work_auth as enum (
  'us_citizen',
  'us_permanent_resident',
  'us_visa_needed',
  'eu_citizen',
  'other'
);

create type remote_preference as enum (
  'remote',
  'hybrid',
  'onsite',
  'flexible'
);

create table candidate_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,

  -- Tier A — captured at onboarding (required to flip the soft gate)
  target_role text,
  target_seniority text,
  industries text[] not null default '{}',
  switch_urgency switch_urgency,
  notice_period_days int,
  work_authorization work_auth,

  -- Tier B — captured at first Express Interest, optional thereafter
  expected_salary_min_cents int,
  expected_salary_max_cents int,
  expected_salary_currency text default 'USD',
  current_location text,
  remote_preference remote_preference,

  -- Tier C — optional, edited only on /profile
  current_salary_cents int,
  current_salary_currency text default 'USD',
  willing_to_relocate boolean,
  target_companies text[] not null default '{}',
  blocklist_companies text[] not null default '{}',
  preferred_domains text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index candidate_preferences_profile_idx
  on candidate_preferences(profile_id);

alter table candidate_preferences enable row level security;

create policy candidate_preferences_self
  on candidate_preferences for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy candidate_preferences_admin
  on candidate_preferences for all to authenticated
  using (is_admin()) with check (is_admin());
