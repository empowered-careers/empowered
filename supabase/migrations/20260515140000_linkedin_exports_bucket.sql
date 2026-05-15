-- Storage bucket for LinkedIn "Save to PDF" profile exports.
-- Mirrors the `resumes` bucket policy at 20260514130000_resumes_add_file_name_and_storage.sql.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'linkedin-exports',
  'linkedin-exports',
  true,
  5242880, -- 5 MiB
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies: users read/write only under folder `{auth.uid()}/...`
DROP POLICY IF EXISTS "linkedin_exports_storage_select_own" ON storage.objects;
DROP POLICY IF EXISTS "linkedin_exports_storage_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "linkedin_exports_storage_update_own" ON storage.objects;
DROP POLICY IF EXISTS "linkedin_exports_storage_delete_own" ON storage.objects;

CREATE POLICY "linkedin_exports_storage_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'linkedin-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "linkedin_exports_storage_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'linkedin-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "linkedin_exports_storage_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'linkedin-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'linkedin-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "linkedin_exports_storage_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'linkedin-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
