-- =============================================================
-- Phase 1 Core Tables — Empowered Platform
-- =============================================================

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────

CREATE TYPE subscription_tier AS ENUM ('free', 'paid_monthly', 'paid_annual');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'expired', 'trial');
CREATE TYPE job_status AS ENUM ('active', 'filled', 'expired');
CREATE TYPE remote_policy AS ENUM ('remote', 'hybrid', 'onsite');
CREATE TYPE relationship_type AS ENUM ('direct_client', 'agency_partner');
CREATE TYPE product_type AS ENUM ('webinar', 'resume_review', 'linkedin_review', 'interview_prep', 'subscription');
CREATE TYPE payment_status AS ENUM ('succeeded', 'pending', 'failed');

-- ─────────────────────────────────────────
-- EMPLOYERS
-- (defined before jobs so FK resolves)
-- ─────────────────────────────────────────

CREATE TABLE employers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name      text NOT NULL,
  contact_name      text NOT NULL,
  contact_email     text NOT NULL,
  relationship_type relationship_type NOT NULL,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────

CREATE TABLE profiles (
  id                       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                    text NOT NULL,
  full_name                text,
  phone                    text,
  linkedin_url             text,
  subscription_tier        subscription_tier NOT NULL DEFAULT 'free',
  subscription_status      subscription_status NOT NULL DEFAULT 'trial',
  stripe_customer_id       text,
  onboarding_completed_at  timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- RESUMES
-- ─────────────────────────────────────────

CREATE TABLE resumes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  raw_file_url text NOT NULL,
  parsed_text  text,
  parsed_json  jsonb,         -- { skills, experience, education }
  ats_score    int CHECK (ats_score BETWEEN 0 AND 100),
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  parsed_at    timestamptz
);

CREATE INDEX resumes_profile_id_idx ON resumes(profile_id);

-- ─────────────────────────────────────────
-- LINKEDIN PROFILES
-- ─────────────────────────────────────────

CREATE TABLE linkedin_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  linkedin_url  text NOT NULL,
  headline      text,
  summary       text,
  profile_score int CHECK (profile_score BETWEEN 0 AND 100),
  raw_json      jsonb,         -- full profile dump
  synced_at     timestamptz
);

CREATE INDEX linkedin_profiles_profile_id_idx ON linkedin_profiles(profile_id);

-- ─────────────────────────────────────────
-- ASSESSMENTS  (template / seed data)
-- ─────────────────────────────────────────

CREATE TABLE assessments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  description    text,
  question_count int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- ASSESSMENT RESPONSES
-- ─────────────────────────────────────────

CREATE TABLE assessment_responses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  responses     jsonb NOT NULL DEFAULT '{}',   -- Q&A pairs
  score         int CHECK (score BETWEEN 0 AND 100),
  completed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, assessment_id)
);

CREATE INDEX assessment_responses_profile_id_idx ON assessment_responses(profile_id);
CREATE INDEX assessment_responses_assessment_id_idx ON assessment_responses(assessment_id);

-- ─────────────────────────────────────────
-- CANDIDATE SCORES  (aggregate)
-- ─────────────────────────────────────────

CREATE TABLE candidate_scores (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id         uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  mindset_score      int CHECK (mindset_score BETWEEN 0 AND 100),
  strengths_score    int CHECK (strengths_score BETWEEN 0 AND 100),
  values_score       int CHECK (values_score BETWEEN 0 AND 100),
  leadership_score   int CHECK (leadership_score BETWEEN 0 AND 100),
  communication_score int CHECK (communication_score BETWEEN 0 AND 100),
  impact_score       int CHECK (impact_score BETWEEN 0 AND 100),
  overall_score      int CHECK (overall_score BETWEEN 0 AND 100),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- JOBS
-- ─────────────────────────────────────────

CREATE TABLE jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by  uuid NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  title         text NOT NULL,
  company_name  text NOT NULL,
  location      text,
  remote_policy remote_policy NOT NULL DEFAULT 'onsite',
  salary_min    int,
  salary_max    int,
  description   text,
  requirements  jsonb,
  posted_at     timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz,
  status        job_status NOT NULL DEFAULT 'active',
  CONSTRAINT salary_range_check CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min)
);

CREATE INDEX jobs_status_idx ON jobs(status);
CREATE INDEX jobs_submitted_by_idx ON jobs(submitted_by);

-- ─────────────────────────────────────────
-- JOB SCORES  (weights per dimension)
-- ─────────────────────────────────────────

CREATE TABLE job_scores (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id               uuid NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  mindset_weight       int NOT NULL DEFAULT 0 CHECK (mindset_weight BETWEEN 0 AND 100),
  strengths_weight     int NOT NULL DEFAULT 0 CHECK (strengths_weight BETWEEN 0 AND 100),
  values_weight        int NOT NULL DEFAULT 0 CHECK (values_weight BETWEEN 0 AND 100),
  leadership_weight    int NOT NULL DEFAULT 0 CHECK (leadership_weight BETWEEN 0 AND 100),
  communication_weight int NOT NULL DEFAULT 0 CHECK (communication_weight BETWEEN 0 AND 100),
  impact_weight        int NOT NULL DEFAULT 0 CHECK (impact_weight BETWEEN 0 AND 100),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- MATCHES
-- ─────────────────────────────────────────

CREATE TABLE matches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id              uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  match_score         int NOT NULL CHECK (match_score BETWEEN 0 AND 100),
  match_reasons       jsonb,    -- why this is a fit
  candidate_interested boolean,
  employer_interested  boolean,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, job_id)
);

CREATE INDEX matches_profile_id_idx ON matches(profile_id);
CREATE INDEX matches_job_id_idx ON matches(job_id);
CREATE INDEX matches_match_score_idx ON matches(match_score DESC);

-- ─────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────

CREATE TABLE payments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id text NOT NULL,
  amount                   int NOT NULL,     -- cents
  product_type             product_type NOT NULL,
  status                   payment_status NOT NULL DEFAULT 'pending',
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_profile_id_idx ON payments(profile_id);
CREATE INDEX payments_status_idx ON payments(status);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_scores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_scores            ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches               ENABLE ROW LEVEL SECURITY;
ALTER TABLE employers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments              ENABLE ROW LEVEL SECURITY;

-- ── profiles ────────────────────────────
CREATE POLICY "profiles: own row only"
  ON profiles FOR ALL
  USING (id = auth.uid());

-- ── resumes ─────────────────────────────
CREATE POLICY "resumes: own rows only"
  ON resumes FOR ALL
  USING (profile_id = auth.uid());

-- ── linkedin_profiles ────────────────────
CREATE POLICY "linkedin_profiles: own rows only"
  ON linkedin_profiles FOR ALL
  USING (profile_id = auth.uid());

-- ── assessments (templates — readable by all authenticated) ──
CREATE POLICY "assessments: read by authenticated"
  ON assessments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ── assessment_responses ─────────────────
CREATE POLICY "assessment_responses: own rows only"
  ON assessment_responses FOR ALL
  USING (profile_id = auth.uid());

-- ── candidate_scores ─────────────────────
CREATE POLICY "candidate_scores: own row only"
  ON candidate_scores FOR ALL
  USING (profile_id = auth.uid());

-- ── jobs (paid subscribers read) ────────
-- We use a helper function to check subscription status
CREATE OR REPLACE FUNCTION is_paid_subscriber()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND subscription_status = 'active'
      AND subscription_tier IN ('paid_monthly', 'paid_annual')
  );
$$;

CREATE POLICY "jobs: visible to paid subscribers"
  ON jobs FOR SELECT
  USING (is_paid_subscriber());

-- ── job_scores ───────────────────────────
CREATE POLICY "job_scores: visible to paid subscribers"
  ON job_scores FOR SELECT
  USING (is_paid_subscriber());

-- ── matches ──────────────────────────────
CREATE POLICY "matches: own rows only"
  ON matches FOR ALL
  USING (profile_id = auth.uid());

-- ── employers (Lauren / admin only) ──────
-- Requires a custom admin claim set via Supabase dashboard or edge function
CREATE POLICY "employers: admin only"
  ON employers FOR ALL
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );

-- ── payments ─────────────────────────────
CREATE POLICY "payments: own rows only"
  ON payments FOR ALL
  USING (profile_id = auth.uid());

-- =============================================================
-- AUTO-CREATE PROFILE ON SIGN-UP
-- =============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
