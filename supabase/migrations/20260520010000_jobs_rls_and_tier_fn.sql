-- Jobs RLS rewrite + tier visibility function + system employer seed
--
-- Replaces the old `is_paid_subscriber()`-gated SELECT policy with:
--   - read: any authenticated user (tier gating is a UI / detail-page concern)
--   - write: is_admin() (helper from 20260520000000_role_enum.sql)
--
-- Also seeds the system employer row that Lauren's curated Tier 1 jobs
-- reference via jobs.submitted_by.

drop policy if exists "jobs: visible to paid subscribers" on jobs;

create policy jobs_read_auth on jobs for select to authenticated
  using (true);

create policy jobs_write_admin on jobs for all to authenticated
  using (is_admin()) with check (is_admin());

-- Tier visibility — mirrored client-side in src/lib/plan.ts.
-- Tier 1 free for all signed-in users; Tier 2 needs any paid plan; Tier 3 is plan_3 only.
create or replace function can_see_job_tier(p plan, t job_tier) returns boolean
  language sql immutable as $$
  select case t
    when 'tier_1' then true
    when 'tier_2' then p in ('plan_1','plan_2','plan_3')
    when 'tier_3' then p = 'plan_3'
  end;
$$;

-- System employer for Lauren-curated roles. Stable UUID so Lauren's admin
-- form and seed data can reference it without lookups. The contact_* fields
-- are required NOT NULL — fill with the Empowered Careers ops mailbox.
insert into employers (id, company_name, contact_name, contact_email, relationship_type)
values ('00000000-0000-0000-0000-000000000001',
        'Empowered Careers / Curated',
        'Empowered Careers (system)',
        'ops@empowered-careers.com',
        'direct_client')
on conflict (id) do nothing;
