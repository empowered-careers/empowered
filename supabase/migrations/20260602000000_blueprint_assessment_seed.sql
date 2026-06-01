-- Career Identity Blueprint — assessment seed + schema extensions
--
-- 1. Seeds the Blueprint assessment definition row with a fixed UUID so app
--    code can reference it as BLUEPRINT_ASSESSMENT_ID without a runtime lookup.
-- 2. Extends assessment_responses with result (full display blob) + archetype
--    (denormalised for fast display / admin lists).
-- 3. Adds culture_axes to candidate_scores (the queryable 0-100 canonical axes
--    from §2.5 of career-blueprint-integration.md) + a GIN index for future
--    axis queries.
--
-- RLS: no changes needed — existing self-access policies on both tables use
-- FOR ALL (covering the new columns automatically), and the employer-read
-- policies in 20260523000001_employer_rls.sql inherit them too.
-- UNIQUE (profile_id, assessment_id) on assessment_responses already exists
-- from 20260513000000_phase1_core_tables.sql.

-- ─────────────────────────────────────────
-- 1. Seed the Blueprint assessment row
-- ─────────────────────────────────────────

insert into assessments (id, name, description, question_count)
values (
  'c1b2e3f4-5a6b-4c8d-9e0f-a1b2c3d4e5f6',
  'Career Identity Blueprint',
  'A 30-question psychometric scan that surfaces your Career Archetype, Leadership Style, Company Fit, Communication Style, and five candidate-score dimensions in a single run.',
  30
)
on conflict (id) do nothing;

-- ─────────────────────────────────────────
-- 2. assessment_responses — display blob + denormalised archetype
-- ─────────────────────────────────────────

alter table assessment_responses
  add column if not exists result   jsonb,
  add column if not exists archetype text;

-- ─────────────────────────────────────────
-- 3. candidate_scores — canonical axes column + GIN index
-- ─────────────────────────────────────────

alter table candidate_scores
  add column if not exists culture_axes jsonb;

create index if not exists candidate_scores_culture_axes_gin
  on candidate_scores using gin (culture_axes);
