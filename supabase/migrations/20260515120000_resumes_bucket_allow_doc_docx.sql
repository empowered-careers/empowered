-- Allow PDF, Word .doc, and .docx on the resumes storage bucket
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
]::text[]
WHERE id = 'resumes';
