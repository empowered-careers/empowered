-- [TEST] seed data: 1 corporate (direct_client) + 1 agency (agency_partner)
-- + 1 client company + 10 jobs across all three tiers.
--
-- Everything is prefixed "[TEST]" so it is trivially identifiable and removable.
-- Run this in the Supabase SQL editor, or:
--   supabase db execute --file supabase/seeds/test_data.sql
--
-- Cleanup (uncomment + run to remove all seeded test data; order respects FKs):
--   delete from jobs where title like '[TEST]%';
--   delete from client_companies where name like '[TEST]%';
--   delete from employers where company_name like '[TEST]%';

do $$
declare
  corp_id   uuid;
  agency_id uuid;
  cc_id     uuid;
begin
  -- Corporate employer (direct_client) — posts its own roles, client_company_id stays null.
  insert into employers (company_name, contact_name, contact_email, relationship_type)
  values ('[TEST] Northwind Tech', 'Test Corp Contact', 'test+corp@empowered-careers.com', 'direct_client')
  returning id into corp_id;

  -- Agency employer (agency_partner) + one private client company it posts for.
  insert into employers (company_name, contact_name, contact_email, relationship_type, commission_rate)
  values ('[TEST] Apex Talent Partners', 'Test Agency Contact', 'test+agency@empowered-careers.com', 'agency_partner', 20.00)
  returning id into agency_id;

  insert into client_companies (agency_employer_id, name, contact_name, contact_email)
  values (agency_id, '[TEST] Helios Fintech', 'Test Client Contact', 'test+client@empowered-careers.com')
  returning id into cc_id;

  -- 5 corporate-posted jobs (client_company_id null), tiers mixed.
  insert into jobs (submitted_by, client_company_id, title, company_name, location, remote_policy, salary_min, salary_max, description, job_tier, status)
  values
    (corp_id, null, '[TEST] Senior Backend Engineer', '[TEST] Northwind Tech', 'San Francisco, CA', 'hybrid', 160000, 210000, 'Test role — backend platform.', 'tier_1', 'active'),
    (corp_id, null, '[TEST] Staff Frontend Engineer', '[TEST] Northwind Tech', 'Remote (US)', 'remote', 180000, 230000, 'Test role — design systems.', 'tier_2', 'active'),
    (corp_id, null, '[TEST] Engineering Manager', '[TEST] Northwind Tech', 'New York, NY', 'onsite', 200000, 260000, 'Test role — manage two squads.', 'tier_3', 'active'),
    (corp_id, null, '[TEST] Product Manager', '[TEST] Northwind Tech', 'Austin, TX', 'hybrid', 150000, 190000, 'Test role — core product.', 'tier_2', 'active'),
    (corp_id, null, '[TEST] Data Scientist', '[TEST] Northwind Tech', 'Remote (US)', 'remote', 155000, 195000, 'Test role — ML / analytics.', 'tier_1', 'active');

  -- 5 agency-posted jobs (client_company_id = cc_id), tiers mixed.
  insert into jobs (submitted_by, client_company_id, title, company_name, location, remote_policy, salary_min, salary_max, description, job_tier, status)
  values
    (agency_id, cc_id, '[TEST] Principal Engineer', '[TEST] Helios Fintech', 'Boston, MA', 'hybrid', 220000, 280000, 'Test role — payments core.', 'tier_3', 'active'),
    (agency_id, cc_id, '[TEST] DevOps Engineer', '[TEST] Helios Fintech', 'Remote (US)', 'remote', 150000, 195000, 'Test role — k8s / IaC.', 'tier_2', 'active'),
    (agency_id, cc_id, '[TEST] Security Engineer', '[TEST] Helios Fintech', 'Seattle, WA', 'onsite', 170000, 215000, 'Test role — appsec.', 'tier_3', 'active'),
    (agency_id, cc_id, '[TEST] Mobile Engineer (iOS)', '[TEST] Helios Fintech', 'Remote (US)', 'remote', 150000, 200000, 'Test role — iOS app.', 'tier_2', 'active'),
    (agency_id, cc_id, '[TEST] QA Automation Engineer', '[TEST] Helios Fintech', 'Chicago, IL', 'hybrid', 120000, 160000, 'Test role — test automation.', 'tier_1', 'active');
end $$;
