-- Admin RLS — uniform `is_admin()` policies across operator-only surfaces.
--
-- Replaces the legacy JWT-metadata checks on employers/commissions, adds
-- blanket admin policies for applications/placements, and lets admins update
-- any profile row (for the internal_notes editor on /admin/candidates/[id]).
-- Candidate-self policies stay in place — admin policies layer alongside them.

-- ── jobs ──────────────────────────────────
-- jobs_write_admin already created in 20260520010000_jobs_rls_and_tier_fn.sql.

-- ── applications ──────────────────────────
drop policy if exists applications_admin_all on applications;
create policy applications_admin_all on applications for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── placements ────────────────────────────
drop policy if exists "placements: own rows readable" on placements;
create policy placements_read_self on placements for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists placements_admin_all on placements;
create policy placements_admin_all on placements for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── commissions ───────────────────────────
drop policy if exists "commissions: admin only" on commissions;
create policy commissions_admin_only on commissions for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── employers ─────────────────────────────
drop policy if exists "employers: admin only" on employers;
create policy employers_admin_only on employers for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── profiles ──────────────────────────────
-- Existing candidate-self select/update policies remain. Admin gets an extra
-- read + update path so the candidate-pool table and internal_notes editor work.
drop policy if exists profiles_admin_read on profiles;
create policy profiles_admin_read on profiles for select to authenticated
  using (is_admin());

drop policy if exists profiles_admin_update on profiles;
create policy profiles_admin_update on profiles for update to authenticated
  using (is_admin()) with check (is_admin());
