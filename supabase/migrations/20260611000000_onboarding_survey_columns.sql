-- Adds columns to candidate_preferences for the new 15-step intake survey.
-- New text columns store survey responses as display strings (no enum constraints
-- needed since these drive personalization/coaching, not access control logic).

ALTER TABLE candidate_preferences
  ADD COLUMN IF NOT EXISTS expertise_area        text,
  ADD COLUMN IF NOT EXISTS biggest_challenge     text,
  ADD COLUMN IF NOT EXISTS primary_goal_6mo      text,
  ADD COLUMN IF NOT EXISTS confidence_level      text,
  ADD COLUMN IF NOT EXISTS role_clarity          text,
  ADD COLUMN IF NOT EXISTS career_readiness      text,
  ADD COLUMN IF NOT EXISTS most_valued_benefit   text,
  ADD COLUMN IF NOT EXISTS support_preference    text,
  ADD COLUMN IF NOT EXISTS comp_target_min_cents int;
