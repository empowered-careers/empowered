-- Candidate-facing RLS on `applications` + realtime publication.
--
-- Admin (`is_admin()` blanket) and employer policies are added by
-- ec-admin-super-plan.md and ec-admin-recruiters-plan.md respectively;
-- those stack additively with the candidate-self policies below.

alter table applications enable row level security;

-- Read own rows only.
create policy applications_read_self on applications for select to authenticated
  using (profile_id = auth.uid());

-- Self-insert is the Express Interest path; status is forced to 'interested'.
create policy applications_insert_self on applications for insert to authenticated
  with check (
    profile_id = auth.uid()
    and status = 'interested'
  );

-- Self-update is restricted to withdrawing — candidates cannot advance their
-- own status to screening/offer/etc.
create policy applications_update_self_withdraw on applications for update to authenticated
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and status = 'withdrawn'
  );

-- Realtime: the candidate's notification hook needs UPDATE events with the
-- previous row, so REPLICA IDENTITY FULL is required.
alter publication supabase_realtime add table applications;
alter table applications replica identity full;
