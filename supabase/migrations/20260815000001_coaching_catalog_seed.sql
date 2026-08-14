-- Seed the 11 purchasable catalog rows from docs/prototypes/pricing.html:
-- 3 bundles (Foundation / Momentum / Executive) + 8 quick-add sessions.
--
-- stripe_price_id is intentionally NULL. Nothing is purchasable until Lauren
-- creates the Stripe Products and pastes each price ID in via /admin/coaching —
-- assertAllowedPriceId() authorizes checkout purely on that column.
--
-- The 22-deliverable breakdown in the prototype is display copy, not rows: only
-- these 11 are individually buyable.
--
-- Fixed UUIDs so bundle_contents can reference them and a re-run is a no-op.
-- Names are chosen so inferProductType() (webhook-handlers.ts) still resolves
-- payments.product_type correctly: "Resume Refresh" → resume_review,
-- "LinkedIn Glow-Up" → linkedin_review, "Mock Interview" → interview_prep,
-- everything else → coaching.

-- ── bundles ───────────────────────────────
-- Silver / Gold / Platinum are tier labels with no column of their own; /pricing
-- renders them from bundle order.
insert into coaching_products (id, name, kind, description, price_cents, is_active)
values
  (
    '7c1f0a01-0000-4000-8000-000000000001',
    'Foundation',
    'bundle',
    'A fast, tangible first win. 3 sessions: LinkedIn optimized for search, a repackaged resume, and one mock interview.',
    45000,
    true
  ),
  (
    '7c1f0a01-0000-4000-8000-000000000002',
    'Momentum',
    'bundle',
    'A real search strategy, built with you. 8 sessions: everything in Foundation plus NorthStar Discovery, market intel, and interview prep with debrief.',
    140000,
    true
  ),
  (
    '7c1f0a01-0000-4000-8000-000000000003',
    'Executive',
    'bundle',
    'The full 360°, white-glove. 13 sessions: everything in Momentum plus mindset work, an executive bio, background and social prep, and first-90-days support.',
    240000,
    true
  )
on conflict (id) do nothing;

-- ── quick-add sessions ────────────────────
insert into coaching_products (id, name, kind, description, price_cents, is_active)
values
  (
    '7c1f0a02-0000-4000-8000-000000000001',
    'Resume Refresh',
    'session',
    'A working session to rebuild your resume around impact, not duties.',
    12500,
    true
  ),
  (
    '7c1f0a02-0000-4000-8000-000000000002',
    'LinkedIn Glow-Up',
    'session',
    'Optimize your profile for search visibility and recruiter attention.',
    15000,
    true
  ),
  (
    '7c1f0a02-0000-4000-8000-000000000003',
    'NorthStar Discovery',
    'session',
    'Define your path, your value, and what you''re actually worth.',
    17500,
    true
  ),
  (
    '7c1f0a02-0000-4000-8000-000000000004',
    'Market Intel Session',
    'session',
    'Target company list, hidden opportunities, and current market trends.',
    17500,
    true
  ),
  (
    '7c1f0a02-0000-4000-8000-000000000005',
    'Mock Interview',
    'session',
    'A full live-fire session with structured debrief and feedback.',
    20000,
    true
  ),
  (
    '7c1f0a02-0000-4000-8000-000000000006',
    'Executive Bio',
    'session',
    'A polished, board-ready bio written for you — not a template.',
    25000,
    true
  ),
  (
    '7c1f0a02-0000-4000-8000-000000000007',
    'Background & Social Prep',
    'session',
    'Clean up your public footprint before it''s reviewed by anyone else.',
    20000,
    true
  ),
  (
    '7c1f0a02-0000-4000-8000-000000000008',
    '90-Day Check-In',
    'session',
    'A single session after you start, to navigate the first 90 days.',
    15000,
    true
  )
on conflict (id) do nothing;

-- ── bundle composition ────────────────────
-- Read off the tier dots in the prototype's breakdown table. NOTE for Lauren:
-- the tiers advertise 3 / 8 / 13 sessions, but only 3 / 5 / 8 of those map to a
-- named quick-add — the remainder is deliverables with no standalone SKU. What's
-- here is what an enrollment grants access to; the session counts are copy.
insert into bundle_contents (bundle_id, product_id)
values
  -- Foundation
  ('7c1f0a01-0000-4000-8000-000000000001', '7c1f0a02-0000-4000-8000-000000000001'),
  ('7c1f0a01-0000-4000-8000-000000000001', '7c1f0a02-0000-4000-8000-000000000002'),
  ('7c1f0a01-0000-4000-8000-000000000001', '7c1f0a02-0000-4000-8000-000000000005'),
  -- Momentum = Foundation + NorthStar + Market Intel
  ('7c1f0a01-0000-4000-8000-000000000002', '7c1f0a02-0000-4000-8000-000000000001'),
  ('7c1f0a01-0000-4000-8000-000000000002', '7c1f0a02-0000-4000-8000-000000000002'),
  ('7c1f0a01-0000-4000-8000-000000000002', '7c1f0a02-0000-4000-8000-000000000005'),
  ('7c1f0a01-0000-4000-8000-000000000002', '7c1f0a02-0000-4000-8000-000000000003'),
  ('7c1f0a01-0000-4000-8000-000000000002', '7c1f0a02-0000-4000-8000-000000000004'),
  -- Executive = Momentum + Executive Bio + Background & Social + 90-Day
  ('7c1f0a01-0000-4000-8000-000000000003', '7c1f0a02-0000-4000-8000-000000000001'),
  ('7c1f0a01-0000-4000-8000-000000000003', '7c1f0a02-0000-4000-8000-000000000002'),
  ('7c1f0a01-0000-4000-8000-000000000003', '7c1f0a02-0000-4000-8000-000000000005'),
  ('7c1f0a01-0000-4000-8000-000000000003', '7c1f0a02-0000-4000-8000-000000000003'),
  ('7c1f0a01-0000-4000-8000-000000000003', '7c1f0a02-0000-4000-8000-000000000004'),
  ('7c1f0a01-0000-4000-8000-000000000003', '7c1f0a02-0000-4000-8000-000000000006'),
  ('7c1f0a01-0000-4000-8000-000000000003', '7c1f0a02-0000-4000-8000-000000000007'),
  ('7c1f0a01-0000-4000-8000-000000000003', '7c1f0a02-0000-4000-8000-000000000008')
on conflict do nothing;
