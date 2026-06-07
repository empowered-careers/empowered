-- Backfill: replace stored LinkedIn `profile-thirdparty-redirect` URLs with the
-- real vanity URL (/in/<handle>). These redirect URLs were captured from
-- /rest/identityMe basicInfo.profileUrl; the vanity handle is available in the
-- stored /v2/me response under raw_json.profileApi.vanityName.
--
-- Rows with a redirect URL but no recoverable vanityName are left untouched —
-- they self-correct on the user's next LinkedIn sign-in via the updated sync.

-- 1) Fix linkedin_profiles rows.
UPDATE linkedin_profiles
SET linkedin_url =
  'https://www.linkedin.com/in/' || (raw_json -> 'profileApi' ->> 'vanityName')
WHERE linkedin_url ~* '^https?://([a-z0-9.-]+\.)?linkedin\.com/profile-thirdparty-redirect/'
  AND raw_json -> 'profileApi' ->> 'vanityName' IS NOT NULL
  AND length(raw_json -> 'profileApi' ->> 'vanityName') > 0;

-- 2) Mirror the corrected URL onto profiles.linkedin_url for the same users.
UPDATE profiles p
SET linkedin_url =
  'https://www.linkedin.com/in/' || (lp.raw_json -> 'profileApi' ->> 'vanityName')
FROM linkedin_profiles lp
WHERE lp.profile_id = p.id
  AND p.linkedin_url ~* '^https?://([a-z0-9.-]+\.)?linkedin\.com/profile-thirdparty-redirect/'
  AND lp.raw_json -> 'profileApi' ->> 'vanityName' IS NOT NULL
  AND length(lp.raw_json -> 'profileApi' ->> 'vanityName') > 0;
