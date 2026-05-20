-- Role enum + auth helpers (super admin plan, Slice 0)
--
-- Adds the role substrate that every admin / employer / agency RLS policy
-- downstream references. Lands before the job-board, candidate-pipeline,
-- events-growth, and agency-portal plans so their policies can call
-- `is_admin()` directly.
--
-- - `profiles.role`        : candidate (default) | admin | employer
-- - `profiles.employer_id` : FK to employers, set when role='employer'
-- - `profiles.internal_notes` : admin-only free text on a candidate
-- - is_admin() / is_employer() / current_employer_id() helpers
--
-- After this migration runs, promote Lauren's profile manually in Studio:
--   update profiles set role = 'admin' where id = '<lauren-auth-uid>';

create type user_role as enum ('candidate', 'admin', 'employer');

alter table profiles
  add column role user_role not null default 'candidate',
  add column employer_id uuid references employers(id) on delete set null,
  add column internal_notes text;

create index profiles_role_idx on profiles(role);
create index profiles_employer_id_idx on profiles(employer_id) where employer_id is not null;

create or replace function is_admin() returns boolean
  language sql stable security definer as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function is_employer() returns boolean
  language sql stable security definer as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'employer'
  );
$$;

create or replace function current_employer_id() returns uuid
  language sql stable security definer as $$
  select employer_id from profiles where id = auth.uid();
$$;
