-- Recruiters Portal (Sprint P2-1) — employer-scoped RLS
--
-- Adds employer-side policies on top of the existing candidate-self and
-- admin-blanket policies. All policies key on
-- `jobs.submitted_by = current_employer_id()` — i.e. visibility scopes on
-- job ownership, never on client_company_id (which is private metadata).
--
-- These are ADDITIVE to existing policies on each table. Do not drop the
-- candidate-self or admin-blanket policies; Postgres OR-combines them.
--
-- See docs/ec-admin-recruiters-plan.md.

-- ─────────────────────────────────────────
-- jobs: employer reads (already permitted to authenticated via job-board
-- policies) and writes their own.
-- ─────────────────────────────────────────
create policy jobs_write_owner_employer on jobs for all to authenticated
  using (is_employer() and submitted_by = current_employer_id())
  with check (is_employer() and submitted_by = current_employer_id());

-- ─────────────────────────────────────────
-- applications: employer reads + updates applications on their own jobs.
-- 'placed' is excluded from the employer with-check — that status drives
-- commissions + fees and stays admin-only.
-- ─────────────────────────────────────────
create policy applications_read_employer on applications for select to authenticated
  using (
    is_employer() and exists (
      select 1 from jobs j
      where j.id = applications.job_id
        and j.submitted_by = current_employer_id()
    )
  );

create policy applications_update_employer on applications for update to authenticated
  using (
    is_employer() and exists (
      select 1 from jobs j
      where j.id = applications.job_id
        and j.submitted_by = current_employer_id()
    )
  )
  with check (
    is_employer()
    and exists (
      select 1 from jobs j
      where j.id = applications.job_id
        and j.submitted_by = current_employer_id()
    )
    and status in ('screening', 'interviewing', 'offer', 'rejected')
  );

-- ─────────────────────────────────────────
-- Candidate PII tables: employer reads only for candidates who applied
-- to one of their jobs. Same pattern repeated across five tables — all
-- share the `profile_id` column, so the policy body is identical modulo
-- the table reference.
-- ─────────────────────────────────────────
create policy profiles_read_employer_on_interest on profiles for select to authenticated
  using (
    is_employer() and exists (
      select 1 from applications a
      join jobs j on j.id = a.job_id
      where a.profile_id = profiles.id
        and j.submitted_by = current_employer_id()
    )
  );

create policy resumes_read_employer_on_interest on resumes for select to authenticated
  using (
    is_employer() and exists (
      select 1 from applications a
      join jobs j on j.id = a.job_id
      where a.profile_id = resumes.profile_id
        and j.submitted_by = current_employer_id()
    )
  );

create policy linkedin_profiles_read_employer_on_interest on linkedin_profiles for select to authenticated
  using (
    is_employer() and exists (
      select 1 from applications a
      join jobs j on j.id = a.job_id
      where a.profile_id = linkedin_profiles.profile_id
        and j.submitted_by = current_employer_id()
    )
  );

create policy candidate_scores_read_employer_on_interest on candidate_scores for select to authenticated
  using (
    is_employer() and exists (
      select 1 from applications a
      join jobs j on j.id = a.job_id
      where a.profile_id = candidate_scores.profile_id
        and j.submitted_by = current_employer_id()
    )
  );

create policy assessment_responses_read_employer_on_interest on assessment_responses for select to authenticated
  using (
    is_employer() and exists (
      select 1 from applications a
      join jobs j on j.id = a.job_id
      where a.profile_id = assessment_responses.profile_id
        and j.submitted_by = current_employer_id()
    )
  );

-- ─────────────────────────────────────────
-- placements: employer reads their own. Writes stay admin-only (drives
-- commission + fee bookkeeping).
-- ─────────────────────────────────────────
create policy placements_read_employer on placements for select to authenticated
  using (is_employer() and employer_id = current_employer_id());
