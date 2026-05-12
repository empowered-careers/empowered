-- Resumes: optional display name for uploaded files
ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS file_name text;

COMMENT ON COLUMN public.resumes.file_name IS 'Original filename at upload (for display).';

-- ── Storage bucket for resume PDFs ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  true,
  5242880, -- 5 MiB
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies: users read/write only under folder `{auth.uid()}/...`
DROP POLICY IF EXISTS "resumes_storage_select_own" ON storage.objects;
DROP POLICY IF EXISTS "resumes_storage_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "resumes_storage_update_own" ON storage.objects;
DROP POLICY IF EXISTS "resumes_storage_delete_own" ON storage.objects;

CREATE POLICY "resumes_storage_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "resumes_storage_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "resumes_storage_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "resumes_storage_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
