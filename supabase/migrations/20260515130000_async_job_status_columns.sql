-- Async background job status columns for `resumes` and `linkedin_profiles`.
-- Pairs with the layout-mounted RealtimeNotifications hooks.

-- ── Resumes ────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.resume_status AS ENUM (
    'uploading',
    'processing',
    'complete',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS status public.resume_status NOT NULL DEFAULT 'processing',
  ADD COLUMN IF NOT EXISTS parse_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS parse_error text NULL;

COMMENT ON COLUMN public.resumes.status IS 'Parse-job lifecycle. Staleness is derived from parsed_at, not modeled here.';
COMMENT ON COLUMN public.resumes.parse_started_at IS 'Set by the parse route when it picks up the row. Detects orphaned processing rows.';
COMMENT ON COLUMN public.resumes.parse_error IS 'Failure reason when status = failed.';

-- Backfill: existing rows are not actively parsing.
UPDATE public.resumes SET status = 'complete' WHERE status = 'processing';

ALTER TABLE public.resumes REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.resumes;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- ── LinkedIn profiles ──────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.linkedin_sync_status AS ENUM (
    'idle',
    'processing',
    'complete',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.linkedin_profiles
  ADD COLUMN IF NOT EXISTS status public.linkedin_sync_status NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS sync_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS sync_error text NULL;

COMMENT ON COLUMN public.linkedin_profiles.status IS 'Sync-job lifecycle. idle = row exists with URL only, no sync run yet.';
COMMENT ON COLUMN public.linkedin_profiles.sync_started_at IS 'Set by the sync route when it picks up the row.';
COMMENT ON COLUMN public.linkedin_profiles.sync_error IS 'Failure reason when status = failed.';

-- Backfill: rows with data already → complete; URL-only rows → idle.
UPDATE public.linkedin_profiles
  SET status = 'complete'
  WHERE synced_at IS NOT NULL;

ALTER TABLE public.linkedin_profiles REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.linkedin_profiles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
