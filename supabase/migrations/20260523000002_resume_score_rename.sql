-- Rename resumes.ats_score → resumes.resume_score.
--
-- Today's column stores the job-agnostic, upload-time LLM score of resume
-- quality (tenure, role progression, skill density, impact signals,
-- formatting). That's a Resume Score, not an ATS Score. The term "ATS Score"
-- is reserved going forward for the candidate-vs-job match score that will
-- live in `matches.match_score` (Sprint 4 / E4 in docs/ec-dev-plan.md).
--
-- Column rename preserves data + the CHECK constraint (Postgres keeps the
-- existing constraint name `resumes_ats_score_check` across the rename;
-- the name never appears in application code).

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'resumes' and column_name = 'ats_score'
  ) then
    alter table resumes rename column ats_score to resume_score;
  end if;
end $$;
