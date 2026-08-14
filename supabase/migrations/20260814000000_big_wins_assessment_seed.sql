-- Big Wins — assessment seed
--
-- Seeds the Big Wins assessment definition row with a fixed UUID so app code
-- can reference it as BIG_WINS_ASSESSMENT_ID without a runtime lookup.
--
-- No schema changes: Big Wins reuses assessment_responses as-is.
--   responses -> raw candidate answers, keyed "<company>|<title>":<category>
--   result    -> BigWinsResult (per-role rewritten bullets, same keys)
-- The rewrite is an overlay read on top of resumes.parsed_json; parser output
-- is never mutated. See docs/big-wins-implementation-plan.md.
--
-- RLS: no changes needed. Existing self-access policies on assessment_responses
-- are FOR ALL, and UNIQUE (profile_id, assessment_id) already exists from
-- 20260513000000_phase1_core_tables.sql, which the upsert relies on.
--
-- question_count is the size of the category bank (9). Any given role surfaces
-- only the 4-6 categories its title routes to.

insert into assessments (id, name, description, question_count)
values (
  'b1965a2c-9d34-4f7e-8c11-6ad2e0f45b73',
  'Big Wins',
  'A resume-mapped Q&A that goes role by role and pulls out the quantified impact behind each one, then rewrites the bullets on your resume as metric-forward achievements.',
  9
)
on conflict (id) do nothing;
