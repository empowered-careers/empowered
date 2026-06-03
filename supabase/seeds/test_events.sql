-- [TEST] seed data: marketing growth events for the /events surface.
--
-- All slugs + titles are prefixed "test-" / "[TEST]" so they are trivially
-- identifiable and removable. Covers all event_type values and a mix of
-- published/draft and upcoming/past states. Dates are relative to run time.
--
-- Run in the Supabase SQL editor, or:
--   supabase db execute --file supabase/seeds/test_events.sql
--
-- Cleanup (uncomment + run to remove all seeded test events):
--   delete from events where slug like 'test-%';

insert into events (slug, title, subtitle, description, event_type, scheduled_at, duration_min, max_seats, replay_url, is_published, is_past)
values
  ('test-webinar-breaking-into-staff', '[TEST] Breaking Into Staff+ Roles', 'A practical webinar for senior ICs', 'Test event — what hiring managers actually look for at the staff level.', 'webinar', now() + interval '7 days', 60, 200, null, true, false),
  ('test-workshop-resume-teardown', '[TEST] Live Resume Teardown', 'Bring your resume, leave with a plan', 'Test event — hands-on workshop reviewing real resumes live.', 'workshop', now() + interval '14 days', 90, 40, null, true, false),
  ('test-ama-career-pivots', '[TEST] AMA: Career Pivots in Tech', 'Ask Lauren anything', 'Test event — open Q&A on switching tracks mid-career.', 'ama', now() + interval '3 days', 45, null, null, true, false),
  ('test-masterclass-negotiation', '[TEST] Comp Negotiation Masterclass', 'Draft — not yet live', 'Test event — draft masterclass, should not appear on the public listing.', 'masterclass', now() + interval '21 days', 75, 100, null, false, false),
  ('test-webinar-linkedin-2025', '[TEST] LinkedIn That Gets You Found', 'Replay available', 'Test event — past webinar with a replay link.', 'webinar', now() - interval '10 days', 60, null, 'https://example.com/replay/test-linkedin', true, true);
