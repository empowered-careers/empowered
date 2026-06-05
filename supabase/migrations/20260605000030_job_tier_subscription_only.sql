-- Jobs are subscription-only: Core (plan_2) unlocks Tier 2, Pro (plan_3)
-- unlocks Tier 3. Retires the old plan_1 grant — a one-time à la carte
-- purchase no longer unlocks the job board. Mirrored in src/lib/plan.ts.

create or replace function can_see_job_tier(p plan, t job_tier) returns boolean
  language sql immutable as $$
  select case t
    when 'tier_1' then true
    when 'tier_2' then p in ('plan_2','plan_3')
    when 'tier_3' then p = 'plan_3'
  end;
$$;
