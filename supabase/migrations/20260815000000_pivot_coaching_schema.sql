-- Coaching/content pivot — step 2 schema (docs/ec-pivot-plan.md §4).
--
-- Four things this fixes on top of the new tables (B1–B4 in that doc):
--   B1  coaching_products had SELECT-only RLS, so every admin write from
--       createCoachingProduct() was silently rejected — hence 0 rows.
--   B2  that same policy required auth.uid() IS NOT NULL, so anonymous
--       visitors saw an empty catalog on /pricing and the homepage.
--   B4  enrollments had no uniqueness, so a retried Stripe webhook could
--       duplicate a grant.
-- (B3 — stripe_price_id missing from the admin form — is app code, not schema.)
--
-- Safe to run as written: coaching_products is empty, so dropping `type` is
-- lossless. `coaching_product_type` is NOT the enum behind payments.product_type
-- (different type, still in use) — dropping it touches nothing else.

-- ── coaches ───────────────────────────────
-- The bench. No cal_link: booking is one shared Cal.com account with a link per
-- event type, which means the link belongs to the product, not the coach.
create table coaches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text,
  specialty text[],
  avatar_url text,
  is_mentor boolean not null default false,  -- graduate-sourced mentors, brief §7
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table coaches enable row level security;

create policy coaches_read_active on coaches for select to anon, authenticated
  using (active);

create policy coaches_admin_all on coaches for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── coaching_products ─────────────────────
-- `kind` supersedes `type`: one taxonomy, and it distinguishes bundles.
-- booking_url is for kind='session'; external_url keeps its existing meaning
-- and becomes the course video embed for kind='course'.
alter table coaching_products
  add column kind text not null default 'service'
    check (kind in ('course', 'session', 'service', 'bundle')),
  add column coach_id uuid references coaches(id),
  add column booking_url text;

alter table coaching_products drop column type;
drop type coaching_product_type;

-- B1 + B2. The old policy must be DROPPED, not just supplemented: policies OR
-- together, so leaving it would keep inactive rows readable by any signed-in user.
drop policy if exists "coaching_products: read by authenticated" on coaching_products;

create policy coaching_products_read_active on coaching_products
  for select to anon, authenticated using (is_active);

create policy coaching_products_admin_all on coaching_products for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── bundle_contents ───────────────────────
-- One Stripe line item, N enrollment rows. The fan-out itself lands in §3.
create table bundle_contents (
  bundle_id  uuid not null references coaching_products(id) on delete cascade,
  product_id uuid not null references coaching_products(id) on delete restrict,
  primary key (bundle_id, product_id)
);

alter table bundle_contents enable row level security;

create policy bundle_contents_read on bundle_contents for select to anon, authenticated
  using (true);

create policy bundle_contents_admin_all on bundle_contents for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── enrollments ───────────────────────────
-- B4: makes the webhook's enrollment insert safely retryable. The handler
-- already swallows 23505 on the payments insert; this gives it the same
-- protection here.
alter table enrollments add constraint enrollments_profile_product_key
  unique (profile_id, product_id);

-- ── jds ───────────────────────────────────
-- Candidate-uploaded job descriptions for the ATS checker (brief §4). Owner-only,
-- mirroring resumes. Read by nothing yet — the table lands with this migration so
-- §4 is a pure app-code change.
create table jds (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  raw_text text,
  file_path text,
  parsed_json jsonb,
  ats_score int,
  gap_summary text,
  -- which surface it came from: free tier is capped per calendar month
  source text not null default 'free' check (source in ('free', 'paid')),
  -- async-job status per CLAUDE.md. No 'uploading' variant: a JD can be pasted
  -- as raw_text with no upload step at all.
  status text not null default 'processing'
    check (status in ('processing', 'complete', 'failed')),
  parse_error text,
  created_at timestamptz not null default now()
);

alter table jds enable row level security;

create policy jds_own_rows on jds for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Serves the free-tier cap count (profile + current month) and the history list.
create index jds_profile_created_idx on jds (profile_id, created_at desc);

-- §4's notification hook needs postgres_changes on this table, same as payments.
alter publication supabase_realtime add table jds;
