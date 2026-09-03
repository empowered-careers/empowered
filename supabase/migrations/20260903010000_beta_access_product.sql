-- "Beta Access" — the product behind a comp'd beta enrollment.
--
-- The purchase gate reads `enrollments`, and enrollments.product_id is NOT NULL,
-- so redeeming the beta invite code needs something to enroll *in*. This is that
-- row: free, and `is_active = false` so it stays out of /pricing, the catalog,
-- and dashboard signals (all of which filter on is_active).
--
-- Fixed UUID so the server action can reference it and a re-run is a no-op,
-- matching 20260815000001_coaching_catalog_seed.sql. Name deliberately avoids
-- inferProductType()'s keywords (resume/linkedin/interview) — it never reaches
-- payments anyway, since there's no payment.
insert into coaching_products (id, name, kind, description, price_cents, is_active)
values (
  '7c1f0a01-0000-4000-8000-0000000000b1',
  'Beta Access',
  'service',
  'Private beta access, granted by invite code. Not for sale.',
  0,
  false
)
on conflict (id) do nothing;
