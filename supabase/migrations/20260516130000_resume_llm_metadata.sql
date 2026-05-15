-- =============================================================
-- Resume LLM pipeline metadata
-- Adds columns for: dedup (file_hash), active-resume tracking
-- (is_current, superseded_at), promoted parsed fields
-- (seniority_level, total_years_exp), and model/prompt versioning
-- (parser_model, scorer_model, prompt_version).
-- =============================================================

ALTER TABLE resumes
  ADD COLUMN parser_model     text,
  ADD COLUMN scorer_model     text,
  ADD COLUMN prompt_version   text,
  ADD COLUMN file_hash        text,
  ADD COLUMN is_current       boolean NOT NULL DEFAULT false,
  ADD COLUMN superseded_at    timestamptz,
  ADD COLUMN seniority_level  text,
  ADD COLUMN total_years_exp  numeric(4, 1);

-- Lookups
CREATE INDEX resumes_profile_current_idx
  ON resumes (profile_id) WHERE is_current = true;
CREATE INDEX resumes_file_hash_idx
  ON resumes (profile_id, file_hash);
CREATE INDEX resumes_seniority_idx
  ON resumes (seniority_level) WHERE is_current = true;

-- Single-current invariant: setting a resume to is_current=true demotes
-- any prior current resume for the same profile and stamps superseded_at.
CREATE OR REPLACE FUNCTION resumes_enforce_single_current()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE resumes
      SET is_current = false,
          superseded_at = now()
    WHERE profile_id = NEW.profile_id
      AND id <> NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER resumes_single_current_trg
  BEFORE INSERT OR UPDATE OF is_current ON resumes
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION resumes_enforce_single_current();
