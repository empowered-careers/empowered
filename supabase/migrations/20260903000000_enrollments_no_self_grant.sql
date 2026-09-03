-- Entitlement can't be self-granted.
--
-- `enrollments` is the à la carte entitlement source of truth (CLAUDE.md rule
-- 2), and the (app) purchase gate now reads it. But its only policy was
--
--   create policy "enrollments: own rows only" on enrollments
--     for all using (profile_id = auth.uid());
--
-- A `for all` policy with no `with_check` reuses the `using` expression as the
-- INSERT check, so any signed-in user could insert their own enrollment row
-- with the publishable key — `product_id` is readable from the public catalog —
-- and walk straight through the gate. Same hole the old
-- `user_metadata.beta_invite_ok` flag had.
--
-- Split it: owners read and update their own rows (setCourseProgress() reports
-- self-declared course progress through the user session), but nobody inserts
-- or deletes. Grants come from the Stripe webhook, which uses the service-role
-- key and bypasses RLS entirely.

drop policy "enrollments: own rows only" on enrollments;

create policy "enrollments: read own" on enrollments
  for select to authenticated
  using (profile_id = auth.uid());

-- Progress/completion only; the row must stay the caller's own on both sides of
-- the update so profile_id can't be reassigned to someone else.
create policy "enrollments: update own" on enrollments
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
