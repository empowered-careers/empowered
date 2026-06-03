-- [TEST] demo employer logins — link auth users to the seeded employers.
--
-- Goal: be able to log in as the agency and the corporate employer created by
-- test_data.sql, and land on /employer.
--
-- An employer login needs THREE things:
--   1. an auth.users row with a password   <- the only part SQL can't do cleanly
--   2. profiles.role = 'employer'          <- this file
--   3. profiles.employer_id -> employers   <- this file
--
-- The handle_new_user() trigger auto-creates the profiles row when the auth
-- user is created, but it defaults to role='candidate' / employer_id=null.
--
-- ============================================================================
-- RECOMMENDED PATH (reliable on hosted Supabase)
-- ============================================================================
-- 1. Supabase Dashboard -> Authentication -> Users -> "Add user":
--      email: test@company.com   password: <your demo password>   [x] Auto Confirm User
--      email: test@agency.com    password: <your demo password>   [x] Auto Confirm User
--    (Auto Confirm is required, otherwise login is blocked on email confirmation.)
--
-- 2. Run the UPDATE block below to promote them to employers and link them.
--
-- 3. Log in at /login with email + password -> you should land on /employer.

update profiles p
set role = 'employer',
    employer_id = e.id
from employers e
where p.email = 'test@company.com'
  and e.company_name = '[TEST] Northwind Tech';        -- the direct_client (corporate)

update profiles p
set role = 'employer',
    employer_id = e.id
from employers e
where p.email = 'test@agency.com'
  and e.company_name = '[TEST] Apex Talent Partners';  -- the agency_partner

-- Verify:
--   select email, role, employer_id from profiles where email in ('test@company.com','test@agency.com');
--   (both rows should show role='employer' with a non-null employer_id)


-- ============================================================================
-- ALTERNATIVE: pure-SQL (no dashboard) — creates the auth users too.
-- Less official; works because GoTrue stores bcrypt password hashes. Uncomment
-- the whole block to use it INSTEAD of the dashboard step above. Sets the
-- demo password to 'demo-password-123' for both accounts.
-- ============================================================================
-- do $$
-- declare
--   corp_uid   uuid := gen_random_uuid();
--   agency_uid uuid := gen_random_uuid();
-- begin
--   -- Corporate demo user
--   insert into auth.users (
--     instance_id, id, aud, role, email, encrypted_password,
--     email_confirmed_at, created_at, updated_at,
--     raw_app_meta_data, raw_user_meta_data
--   ) values (
--     '00000000-0000-0000-0000-000000000000', corp_uid, 'authenticated', 'authenticated',
--     'test@company.com', extensions.crypt('demo-password-123', extensions.gen_salt('bf')),
--     now(), now(), now(),
--     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
--   );
--   insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
--   values (corp_uid::text, corp_uid,
--           jsonb_build_object('sub', corp_uid::text, 'email', 'test@company.com', 'email_verified', true),
--           'email', now(), now(), now());
--
--   -- Agency demo user
--   insert into auth.users (
--     instance_id, id, aud, role, email, encrypted_password,
--     email_confirmed_at, created_at, updated_at,
--     raw_app_meta_data, raw_user_meta_data
--   ) values (
--     '00000000-0000-0000-0000-000000000000', agency_uid, 'authenticated', 'authenticated',
--     'test@agency.com', extensions.crypt('demo-password-123', extensions.gen_salt('bf')),
--     now(), now(), now(),
--     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
--   );
--   insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
--   values (agency_uid::text, agency_uid,
--           jsonb_build_object('sub', agency_uid::text, 'email', 'test@agency.com', 'email_verified', true),
--           'email', now(), now(), now());
-- end $$;
--
-- -- then run the two UPDATE statements above to set role + employer_id.


-- ============================================================================
-- Cleanup
-- ============================================================================
-- Dashboard path: delete the two users in Authentication -> Users.
-- Pure-SQL path:  delete from auth.users where email in ('test@company.com','test@agency.com');
--                 (cascades to auth.identities and profiles)
