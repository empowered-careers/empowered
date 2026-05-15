-- =============================================================
-- S1 Schema Realign — Plan vs Job Tier, pipeline, coaching, commissions
--
-- Lands the remaining S1 work from docs/ec-dev-plan.md:
--   • Plan + billing_cadence split (replaces subscription_tier)
--   • job_tier enum + column on jobs
--   • candidate_scores / job_scores trimmed to the 5 Phase-1 dimensions
--   • applications, placements, referrals  (G2/G3 pipeline)
--   • coaching_products, enrollments, coaching_sessions  (G4)
--   • commissions  + employers.commission_rate  (G5)
--   • is_paid_subscriber() now reads `plan`
-- =============================================================

-- ─────────────────────────────────────────
-- 1. NEW ENUMS
-- ─────────────────────────────────────────

CREATE TYPE plan AS ENUM ('free', 'plan_1', 'plan_2', 'plan_3');
CREATE TYPE billing_cadence AS ENUM ('one_time', 'monthly', 'annual');
CREATE TYPE job_tier AS ENUM ('tier_1', 'tier_2', 'tier_3');

CREATE TYPE application_status AS ENUM (
  'interested',
  'submitted',
  'screening',
  'interviewing',
  'offer',
  'placed',
  'rejected',
  'withdrawn'
);

CREATE TYPE coaching_product_type AS ENUM ('module', 'session_pack', 'one_to_one');
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'expired', 'refunded');
CREATE TYPE coaching_session_status AS ENUM ('scheduled', 'completed', 'no_show', 'canceled');

CREATE TYPE referral_status AS ENUM ('invited', 'signed_up', 'placed');
CREATE TYPE placement_status AS ENUM ('pending', 'confirmed', 'guarantee_period', 'finalized', 'refunded');
CREATE TYPE commission_status AS ENUM ('pending', 'invoiced', 'paid', 'written_off');

-- ─────────────────────────────────────────
-- 2. PROFILES — drop subscription_tier, add plan + billing_cadence
-- ─────────────────────────────────────────

-- Drop dependent RLS policies first, then the function, then recreate both below.
DROP POLICY IF EXISTS "jobs: visible to paid subscribers" ON jobs;
DROP POLICY IF EXISTS "job_scores: visible to paid subscribers" ON job_scores;
DROP FUNCTION IF EXISTS is_paid_subscriber();

ALTER TABLE profiles
  ADD COLUMN plan plan NOT NULL DEFAULT 'free',
  ADD COLUMN billing_cadence billing_cadence;

-- Best-effort mapping from the legacy enum:
--   paid_monthly → (plan_2, monthly)
--   paid_annual  → (plan_2, annual)
--   free         → (free, NULL)
UPDATE profiles
SET plan = 'plan_2',
    billing_cadence = 'monthly'
WHERE subscription_tier = 'paid_monthly';

UPDATE profiles
SET plan = 'plan_2',
    billing_cadence = 'annual'
WHERE subscription_tier = 'paid_annual';

ALTER TABLE profiles DROP COLUMN subscription_tier;
DROP TYPE subscription_tier;

-- A plan != free implies a cadence (one_time for plan_1, monthly/annual for plan_2/3).
ALTER TABLE profiles
  ADD CONSTRAINT profiles_plan_cadence_chk
  CHECK (plan = 'free' OR billing_cadence IS NOT NULL);

-- Recreate is_paid_subscriber() against the new column.
CREATE OR REPLACE FUNCTION is_paid_subscriber()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND subscription_status = 'active'
      AND plan <> 'free'
  );
$$;

-- Recreate RLS policies that depend on the updated function.
CREATE POLICY "jobs: visible to paid subscribers"
  ON jobs FOR SELECT
  USING (is_paid_subscriber());

CREATE POLICY "job_scores: visible to paid subscribers"
  ON job_scores FOR SELECT
  USING (is_paid_subscriber());

-- ─────────────────────────────────────────
-- 3. JOBS — add job_tier
-- ─────────────────────────────────────────

ALTER TABLE jobs
  ADD COLUMN job_tier job_tier NOT NULL DEFAULT 'tier_1';

CREATE INDEX jobs_job_tier_idx ON jobs(job_tier);

-- ─────────────────────────────────────────
-- 4. CANDIDATE_SCORES + JOB_SCORES — add role_clarity
--    Phase 1 uses 5 dimensions (role_clarity, values, strengths, leadership,
--    impact). mindset_score / communication_score are kept on-table for the
--    Phase 2 expanded-assessments work — Phase 1 code should simply ignore
--    them. See docs/ec-dev-plan.md → Sprint P2-5.
-- ─────────────────────────────────────────

ALTER TABLE candidate_scores
  ADD COLUMN role_clarity_score int CHECK (role_clarity_score BETWEEN 0 AND 100);

ALTER TABLE job_scores
  ADD COLUMN role_clarity_weight int NOT NULL DEFAULT 0
    CHECK (role_clarity_weight BETWEEN 0 AND 100);

-- ─────────────────────────────────────────
-- 5. EMPLOYERS — commission_rate
--    (relationship_type already exists from S0)
-- ─────────────────────────────────────────

ALTER TABLE employers
  ADD COLUMN commission_rate numeric(5,2)
    CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 100));

-- ─────────────────────────────────────────
-- 6. APPLICATIONS
-- ─────────────────────────────────────────

CREATE TABLE applications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id       uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status       application_status NOT NULL DEFAULT 'interested',
  status_log   jsonb NOT NULL DEFAULT '[]'::jsonb,
  internal_notes text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, job_id)
);

CREATE INDEX applications_profile_id_idx ON applications(profile_id);
CREATE INDEX applications_job_id_idx ON applications(job_id);
CREATE INDEX applications_status_idx ON applications(status);

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- 7. PLACEMENTS
-- ─────────────────────────────────────────

CREATE TABLE placements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id          uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  employer_id     uuid NOT NULL REFERENCES employers(id) ON DELETE RESTRICT,
  placed_at       timestamptz NOT NULL DEFAULT now(),
  start_date      date,
  salary          int,
  fee_amount      int,
  status          placement_status NOT NULL DEFAULT 'pending',
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX placements_profile_id_idx ON placements(profile_id);
CREATE INDEX placements_employer_id_idx ON placements(employer_id);
CREATE INDEX placements_status_idx ON placements(status);

CREATE TRIGGER placements_updated_at
  BEFORE UPDATE ON placements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- 8. REFERRALS
-- ─────────────────────────────────────────

CREATE TABLE referrals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_email     text NOT NULL,
  referred_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  placement_id       uuid REFERENCES placements(id) ON DELETE SET NULL,
  status             referral_status NOT NULL DEFAULT 'invited',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referrer_id, referred_email)
);

CREATE INDEX referrals_referrer_id_idx ON referrals(referrer_id);
CREATE INDEX referrals_referred_profile_id_idx ON referrals(referred_profile_id);

CREATE TRIGGER referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- 9. COACHING PRODUCTS / ENROLLMENTS / SESSIONS
-- ─────────────────────────────────────────

CREATE TABLE coaching_products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  type          coaching_product_type NOT NULL,
  external_url  text,
  stripe_price_id text,
  price_cents   int,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER coaching_products_updated_at
  BEFORE UPDATE ON coaching_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE enrollments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES coaching_products(id) ON DELETE RESTRICT,
  payment_id  uuid REFERENCES payments(id) ON DELETE SET NULL,
  status      enrollment_status NOT NULL DEFAULT 'active',
  progress    int NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX enrollments_profile_id_idx ON enrollments(profile_id);
CREATE INDEX enrollments_product_id_idx ON enrollments(product_id);

CREATE TRIGGER enrollments_updated_at
  BEFORE UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE coaching_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  profile_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  duration_min  int,
  cal_event_id  text,
  status        coaching_session_status NOT NULL DEFAULT 'scheduled',
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX coaching_sessions_enrollment_id_idx ON coaching_sessions(enrollment_id);
CREATE INDEX coaching_sessions_profile_id_idx ON coaching_sessions(profile_id);

CREATE TRIGGER coaching_sessions_updated_at
  BEFORE UPDATE ON coaching_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- 10. COMMISSIONS
-- ─────────────────────────────────────────

CREATE TABLE commissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id  uuid NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
  employer_id   uuid NOT NULL REFERENCES employers(id) ON DELETE RESTRICT,
  amount_cents  int NOT NULL,
  rate          numeric(5,2),
  status        commission_status NOT NULL DEFAULT 'pending',
  invoiced_at   timestamptz,
  paid_at       timestamptz,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX commissions_placement_id_idx ON commissions(placement_id);
CREATE INDEX commissions_employer_id_idx ON commissions(employer_id);
CREATE INDEX commissions_status_idx ON commissions(status);

CREATE TRIGGER commissions_updated_at
  BEFORE UPDATE ON commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- 11. RLS — new tables
-- ─────────────────────────────────────────

ALTER TABLE applications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE placements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions        ENABLE ROW LEVEL SECURITY;

-- Candidates see/manage their own application rows; status transitions are gated server-side.
CREATE POLICY "applications: own rows only"
  ON applications FOR ALL
  USING (profile_id = auth.uid());

-- Candidates read their own placements; admin writes happen via service role.
CREATE POLICY "placements: own rows readable"
  ON placements FOR SELECT
  USING (profile_id = auth.uid());

-- Referrer reads/writes their referrals; the invited side never reads.
CREATE POLICY "referrals: own referrals only"
  ON referrals FOR ALL
  USING (referrer_id = auth.uid());

-- Product catalog is public-to-authenticated; admin writes via service role.
CREATE POLICY "coaching_products: read by authenticated"
  ON coaching_products FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "enrollments: own rows only"
  ON enrollments FOR ALL
  USING (profile_id = auth.uid());

CREATE POLICY "coaching_sessions: own rows only"
  ON coaching_sessions FOR ALL
  USING (profile_id = auth.uid());

-- Commissions are admin-only — same shape as employers policy.
CREATE POLICY "commissions: admin only"
  ON commissions FOR ALL
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );
