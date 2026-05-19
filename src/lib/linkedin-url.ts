/** Public profile: /in/, /pub/, or /sales/ */
const LINKEDIN_PROFILE_PATH =
  /^https:\/\/([a-z0-9.-]+\.)?linkedin\.com\/(in|pub|sales)\/[^/?#]+\/?$/i;

/** LinkedIn REST identityMe may return this shape (resolves to member profile). */
const LINKEDIN_THIRD_PARTY_REDIRECT =
  /^https:\/\/([a-z0-9.-]+\.)?linkedin\.com\/profile-thirdparty-redirect\/[^/?#]+\/?$/i;

export type NormalizeLinkedInUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Normalize and validate a LinkedIn profile URL for storage in `profiles.linkedin_url`.
 * Accepts standard /in/… URLs and LinkedIn-hosted `profile-thirdparty-redirect` URLs.
 */
export function normalizeLinkedInProfileUrl(
  raw: string
): NormalizeLinkedInUrlResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter your LinkedIn profile URL" };
  }

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return { ok: false, error: "Must be a valid URL" };
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, error: "Must be an http(s) URL" };
  }

  if (!u.hostname.toLowerCase().endsWith("linkedin.com")) {
    return { ok: false, error: "URL must be on linkedin.com" };
  }

  u.protocol = "https:";
  u.search = "";
  u.hash = "";
  const normalized = u.toString().replace(/\/+$/, "");

  if (
    !LINKEDIN_PROFILE_PATH.test(normalized) &&
    !LINKEDIN_THIRD_PARTY_REDIRECT.test(normalized)
  ) {
    return {
      ok: false,
      error:
        "Use a LinkedIn profile URL (e.g. https://www.linkedin.com/in/your-handle)",
    };
  }

  return { ok: true, url: normalized };
}
