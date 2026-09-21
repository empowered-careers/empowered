-- Stop the OAuth sync trigger from overwriting a name the candidate edited.
--
-- `handle_auth_user_updated` fires on every auth.users change, including every
-- sign-in that refreshes provider metadata. It unconditionally wrote the
-- provider's name over profiles.full_name, so once we let candidates correct a
-- mis-parsed name on /profile, their edit would silently revert the next time
-- they signed in.
--
-- New rule: OAuth seeds full_name once, when we have nothing. After that the
-- profiles row is the source of truth. Everything else in this function is
-- unchanged -- it is restated in full only because CREATE OR REPLACE FUNCTION
-- requires the whole body.

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
    -- Seed only. A name already on the profile (from an earlier sign-in or a
    -- candidate's own correction) always wins.
    full_name = COALESCE(p.full_name, v_full_name),
    linkedin_url = COALESCE(v_linkedin_url, p.linkedin_url),
    linkedin_provider_id = COALESCE(v_linkedin_id, p.linkedin_provider_id),
    google_provider_id = COALESCE(v_google_id, p.google_provider_id)
  WHERE p.id = NEW.id;

  RETURN NEW;
END;
$$;
