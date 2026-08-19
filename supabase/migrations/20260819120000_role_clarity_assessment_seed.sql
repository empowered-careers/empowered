-- Role Clarity — assessment seed
--
-- Seeds the Role Clarity assessment definition row with a fixed UUID so app code
-- can reference it as ROLE_CLARITY_ASSESSMENT_ID without a runtime lookup.
--
-- No schema changes: Role Clarity reuses assessment_responses as-is.
--   responses -> raw candidate answers, questionIndex (0-17) -> optionIndex
--   result    -> RoleClarityResult (section totals, overall, band, weakest)
--   score     -> the normalised 0-100 value, mirroring candidate_scores
-- Scoring is pure TypeScript (src/lib/assessment/role-clarity.ts), so this runs
-- synchronously in the server action — no Inngest, no Realtime hook.
--
-- RLS: no changes needed. Existing self-access policies on assessment_responses
-- are FOR ALL, and UNIQUE (profile_id, assessment_id) already exists from
-- 20260513000000_phase1_core_tables.sql, which the upsert relies on.
--
-- question_count is 18: 6 sections x 3 questions, each section one 1-5 Likert
-- plus two 1-4 choices (13 per section, 78 overall). See docs/role-clarity-spec.md.

insert into assessments (id, name, description, question_count)
values (
  'd3f0a71b-2e64-4c95-9a08-5b7c1e2d8f40',
  'Role Clarity',
  'An 18-question scan of what you have actually done — scope, impact, decision authority, company fit, and market direction — that pins down the titles you should be targeting and shows where your search is still fuzzy.',
  18
)
on conflict (id) do nothing;
