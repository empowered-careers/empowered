-- OAuth / federated identity sync into public.profiles
-- Extends Phase 1: provider subjects, normalized name/email, update sync from auth.users.

-- ── New columns ─────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linkedin_provider_id text,
  ADD COLUMN IF NOT EXISTS google_provider_id text;

COMMENT ON COLUMN public.profiles.linkedin_provider_id IS
  'LinkedIn OIDC subject (sub) / auth.identities.provider_id; not the vanity profile URL.';
COMMENT ON COLUMN public.profiles.google_provider_id IS
  'Google OIDC subject (sub) / auth.identities.provider_id.';

-- ── Replace signup trigger (hardened search_path) ───────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email           text;
  v_full_name       text;
  v_linkedin_id     text;
  v_google_id       text;
  v_linkedin_url    text;
  v_meta            jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_app             jsonb := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb);
  v_provider        text := NULLIF(trim(v_app ->> 'provider'), '');
BEGIN
  v_email := COALESCE(
    NULLIF(trim(NEW.email::text), ''),
    NULLIF(trim(v_meta ->> 'email'), ''),
    ''
  );

  v_full_name := NULLIF(trim(COALESCE(
    NULLIF(trim(v_meta ->> 'full_name'), ''),
    NULLIF(trim(v_meta ->> 'name'), ''),
    trim(concat_ws(
      ' ',
      NULLIF(trim(v_meta ->> 'given_name'), ''),
      NULLIF(trim(v_meta ->> 'family_name'), '')
    ))
  )), '');

  SELECT NULLIF(
    trim(COALESCE(i.provider_id::text, i.identity_data ->> 'sub')),
    ''
  ) INTO v_linkedin_id
  FROM auth.identities AS i
  WHERE i.user_id = NEW.id
    AND i.provider IN ('linkedin', 'linkedin_oidc')
  ORDER BY i.last_sign_in_at DESC NULLS LAST
  LIMIT 1;

  IF v_linkedin_id IS NULL
     AND v_provider IN ('linkedin', 'linkedin_oidc')
     AND NULLIF(trim(v_meta ->> 'sub'), '') IS NOT NULL
  THEN
    v_linkedin_id := trim(v_meta ->> 'sub');
  END IF;

  SELECT NULLIF(
    trim(COALESCE(i.provider_id::text, i.identity_data ->> 'sub')),
    ''
  ) INTO v_google_id
  FROM auth.identities AS i
  WHERE i.user_id = NEW.id
    AND i.provider = 'google'
  ORDER BY i.last_sign_in_at DESC NULLS LAST
  LIMIT 1;

  IF v_google_id IS NULL
     AND v_provider = 'google'
     AND NULLIF(trim(v_meta ->> 'sub'), '') IS NOT NULL
  THEN
    v_google_id := trim(v_meta ->> 'sub');
  END IF;

  -- Only set linkedin_url when value looks like a LinkedIn profile URL (not picture, etc.)
  SELECT NULLIF(trim(cand), '') INTO v_linkedin_url
  FROM (
    SELECT v_meta ->> 'profile' AS cand
    UNION ALL
    SELECT v_meta ->> 'linkedin'
    UNION ALL
    SELECT v_meta ->> 'public_profile_url'
  ) AS u
  WHERE cand ~* '^https?://([a-z0-9.-]+\.)?linkedin\.com/'
  LIMIT 1;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    linkedin_url,
    linkedin_provider_id,
    google_provider_id
  )
  VALUES (
    NEW.id,
    v_email,
    NULLIF(v_full_name, ''),
    v_linkedin_url,
    v_linkedin_id,
    v_google_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── Keep profiles in sync when auth.users changes ───────────
CREATE OR REPLACE FUNCTION public.handle_auth_user_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email           text;
  v_full_name       text;
  v_linkedin_id     text;
  v_google_id       text;
  v_linkedin_url    text;
  v_meta            jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_app             jsonb := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb);
  v_provider        text := NULLIF(trim(v_app ->> 'provider'), '');
BEGIN
  IF NEW.email IS NOT DISTINCT FROM OLD.email
     AND NEW.raw_user_meta_data IS NOT DISTINCT FROM OLD.raw_user_meta_data
     AND NEW.raw_app_meta_data IS NOT DISTINCT FROM OLD.raw_app_meta_data
  THEN
    RETURN NEW;
  END IF;

  v_email := COALESCE(
    NULLIF(trim(NEW.email::text), ''),
    NULLIF(trim(v_meta ->> 'email'), '')
  );

  v_full_name := NULLIF(trim(COALESCE(
    NULLIF(trim(v_meta ->> 'full_name'), ''),
    NULLIF(trim(v_meta ->> 'name'), ''),
    trim(concat_ws(
      ' ',
      NULLIF(trim(v_meta ->> 'given_name'), ''),
      NULLIF(trim(v_meta ->> 'family_name'), '')
    ))
  )), '');

  SELECT NULLIF(
    trim(COALESCE(i.provider_id::text, i.identity_data ->> 'sub')),
    ''
  ) INTO v_linkedin_id
  FROM auth.identities AS i
  WHERE i.user_id = NEW.id
    AND i.provider IN ('linkedin', 'linkedin_oidc')
  ORDER BY i.last_sign_in_at DESC NULLS LAST
  LIMIT 1;

  IF v_linkedin_id IS NULL
     AND v_provider IN ('linkedin', 'linkedin_oidc')
     AND NULLIF(trim(v_meta ->> 'sub'), '') IS NOT NULL
  THEN
    v_linkedin_id := trim(v_meta ->> 'sub');
  END IF;

  SELECT NULLIF(
    trim(COALESCE(i.provider_id::text, i.identity_data ->> 'sub')),
    ''
  ) INTO v_google_id
  FROM auth.identities AS i
  WHERE i.user_id = NEW.id
    AND i.provider = 'google'
  ORDER BY i.last_sign_in_at DESC NULLS LAST
  LIMIT 1;

  IF v_google_id IS NULL
     AND v_provider = 'google'
     AND NULLIF(trim(v_meta ->> 'sub'), '') IS NOT NULL
  THEN
    v_google_id := trim(v_meta ->> 'sub');
  END IF;

  SELECT NULLIF(trim(cand), '') INTO v_linkedin_url
  FROM (
    SELECT v_meta ->> 'profile' AS cand
    UNION ALL
    SELECT v_meta ->> 'linkedin'
    UNION ALL
    SELECT v_meta ->> 'public_profile_url'
  ) AS u
  WHERE cand ~* '^https?://([a-z0-9.-]+\.)?linkedin\.com/'
  LIMIT 1;

  UPDATE public.profiles AS p
  SET
    email = COALESCE(v_email, p.email),
    full_name = CASE
      WHEN v_full_name IS NOT NULL AND v_full_name <> '' THEN v_full_name
      ELSE p.full_name
    END,
    linkedin_url = COALESCE(v_linkedin_url, p.linkedin_url),
    linkedin_provider_id = COALESCE(v_linkedin_id, p.linkedin_provider_id),
    google_provider_id = COALESCE(v_google_id, p.google_provider_id)
  WHERE p.id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_updated();
