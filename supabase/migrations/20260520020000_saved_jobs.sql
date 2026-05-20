-- saved_jobs: candidate bookmarks on the job board.
--
-- Composite PK (profile_id, job_id) gives us idempotent upserts and an index
-- on profile_id for the "Saved roles" page query for free.

create table saved_jobs (
  profile_id uuid not null references profiles(id) on delete cascade,
  job_id     uuid not null references jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, job_id)
);

alter table saved_jobs enable row level security;

create policy saved_jobs_self on saved_jobs for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
