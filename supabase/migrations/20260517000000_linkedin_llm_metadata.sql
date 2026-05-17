-- =============================================================
-- LinkedIn LLM pipeline metadata
-- Adds: parser/scorer/prompt versioning, file_hash (dedup),
-- last_export_path (retry without re-upload), parsed_json (structured
-- PDF parse + scoring). Enforces one-row-per-profile with UNIQUE
-- constraint, after deduping any existing rows.
-- =============================================================

-- Backfill: drop duplicate (profile_id) rows before adding UNIQUE.
-- Keep the most-recently-synced row; tiebreaker on `id` so two NULL-synced
-- duplicates don't both survive (otherwise neither side of < is true).
DELETE FROM linkedin_profiles a
USING linkedin_profiles b
WHERE a.profile_id = b.profile_id
  AND (
    COALESCE(a.synced_at, 'epoch'::timestamptz) < COALESCE(b.synced_at, 'epoch'::timestamptz)
    OR (
      COALESCE(a.synced_at, 'epoch'::timestamptz) = COALESCE(b.synced_at, 'epoch'::timestamptz)
      AND a.id < b.id
    )
  );

ALTER TABLE linkedin_profiles
  ADD COLUMN parser_model      text,
  ADD COLUMN scorer_model      text,
  ADD COLUMN prompt_version    text,
  ADD COLUMN file_hash         text,
  ADD COLUMN last_export_path  text,
  ADD COLUMN parsed_json       jsonb;

ALTER TABLE linkedin_profiles
  ADD CONSTRAINT linkedin_profiles_profile_id_unique UNIQUE (profile_id);

CREATE INDEX linkedin_profiles_file_hash_idx
  ON linkedin_profiles (profile_id, file_hash);
