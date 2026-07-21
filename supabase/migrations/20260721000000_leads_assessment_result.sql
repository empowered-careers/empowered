-- Adds a jsonb column to leads holding the Career Positioning Assessment result
-- (tier, overall %, per-category breakdown, raw answers). Populated when a
-- public quiz-taker reaches the results screen; null for event-registration leads.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS assessment_result jsonb;
