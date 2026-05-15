-- Phase 1: revert DOCX allowance from 20260515120000_resumes_bucket_allow_doc_docx.sql.
-- DOCX requires conversion (Claude document blocks don't accept it natively); deferred to Phase 2.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf']::text[]
WHERE id = 'resumes';
