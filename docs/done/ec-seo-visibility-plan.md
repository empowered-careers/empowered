# Empowered Careers — Search & AI Visibility Plan

> Created: June 2026
> Scope: Technical SEO foundation + JSON-LD structured data + AI-crawler discoverability (`llms.txt`) for the public marketing/events surface
> Related:
>
> - `docs/done/ec-events-growth-plan.md` — the events system is the one real dynamic public surface this plan makes discoverable.
> - `docs/ec-candidate-journey.md` — defines the tiered job model (Tier 3 = "the moat, never posted publicly") that rules out classic programmatic job-page SEO.
> - `src/app/(public)/` — the consolidated marketing/public route group these changes target.

---

## Context

The public marketing surface was just consolidated under `src/app/(public)/` (homepage, events, stub pages: about/team/privacy/terms/blog). Root metadata and the dynamic OG-image route (`/api/og`) are solid, but the discoverability layer is incomplete and partly **incorrect**:

- `src/app/sitemap.ts` lists `/dashboard` (now auth-gated, must never be indexed) and `/login`, and **omits every real public page** including dynamic events.
- `src/app/robots.ts` only disallows `/dashboard/` and `/api/` — `/admin`, `/employer`, and auth routes are left crawlable.
- **No JSON-LD** anywhere → no rich results in Google.
- **No `llms.txt`** → no curated entry point for AI crawlers (ChatGPT, Perplexity, Claude).
- Google verification is a literal placeholder (`"your-google-verification-code"`); no web manifest.
- Event landing pages receive channel-tagged query strings (`?src=linkedin`, `?ref=...`) with **no canonical**, so crawlers see many duplicate URLs per event.

**Why not "programmatic SEO" in the classic sense:** Empowered Careers is a _closed-loop_ product. Per `ec-candidate-journey.md`, Tier 3 roles are "the moat — never posted publicly," and `/job-board` is already `noindex` + auth-gated. There is **no large public dataset to template into pages**. The indexable surfaces are the marketing pages, the **events** system, and a **future blog**. So the high-leverage work is technical SEO + structured data + AI discoverability — not mass page generation.

**Scope decision:** Workstreams 1–3 below ship now. The blog/content engine (MDX vs Sanity/Contentful — TBD) is **deferred**; sitemap and `llms.txt` are built so blog posts slot in with a one-line extension later.

---

## Reused building blocks (don't re-invent)

- `siteConfig` + `siteUrl` — `src/config/site.ts` (name, shortName, description, keywords).
- `/api/og` route — `src/app/api/og/route.tsx`, takes `?title=&description=&theme=`. Use for per-event OG images.
- `EVENT_CARD_COLUMNS` / `EventRow` — `src/types/db.ts`. Relevant columns: `slug, title, subtitle, description, event_type, host_name, scheduled_at, duration_min, replay_url, cover_image_url, is_published, is_past, updated_at`.
- Event date/label helpers — `src/lib/events.ts` (`eventTypeLabel`, `formatEventDateLong`, `normalizeSource`).
- Supabase RLS policy `events_read_public` allows **anon** select of published events → sitemap/`llms.txt` can read events without a user session.

---

## Workstream 1 — Technical SEO foundation

1. **Rewrite `src/app/sitemap.ts`** → `async`, data-driven.
   - Static public entries: `/`, `/events`, `/about`, `/team`, `/privacy`, `/terms`, `/blog`.
   - Dynamic: one entry per **published** event (`/events/[slug]`), `lastModified` from `events.updated_at`.
   - **Remove** `/dashboard` and `/login`.
   - Read events with a **cookieless anon Supabase client** (anon key) so the file can be statically generated / ISR-cached. Add `export const revalidate = 3600`.

2. **Rewrite `src/app/robots.ts`** — expand `disallow` to all private prefixes: `/dashboard`, `/profile`, `/resume`, `/job-board`, `/assessment`, `/assessments`, `/pipeline`, `/linkedin`, `/content`, `/onboarding`, `/admin`, `/employer`, `/employer-not-linked`, `/login`, `/forgot-password`, `/reset-password`, `/api`. Keep `allow: "/"` and the `sitemap` reference. (Optional: explicit allow rules for `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended` to make AI-crawler intent explicit.)

3. **Canonicals (dedupe channel-tagged URLs).** In the event `generateMetadata` (`src/app/(public)/events/[slug]/page.tsx`), set `alternates: { canonical: "/events/<slug>" }` so `?src=`/`?ref=` variants collapse to one indexable URL. Add `alternates.canonical` to the static `(public)` pages too (cheap, per-page `metadata`).

4. **Per-event OG images.** In the same `generateMetadata`, set `openGraph.images` + `twitter.images` to `/api/og?title=<title>&description=<subtitle>` (fall back to `cover_image_url` when present). Today every event inherits the generic site OG card.

5. **Env-driven Google verification.** Add optional `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` to `env.ts`; in `src/app/layout.tsx` set `verification.google` from it and omit the field when unset (remove the hardcoded placeholder).

6. **Add `src/app/manifest.ts`** (`MetadataRoute.Manifest`) — `name`, `short_name` (`siteConfig.shortName`), `description`, `start_url: "/"`, `display: "standalone"`, theme/background colors, `icons`. **Check `public/` for existing icon assets first**; if only a favicon exists, ship a minimal manifest and flag missing icon sizes rather than inventing assets.

---

## Workstream 2 — JSON-LD structured data

1. **Create `src/components/seo/json-ld.tsx`** — a tiny server component rendering `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />`. Single reusable primitive.

2. **Organization schema — sitewide.** Render `<JsonLd>` with an `Organization` object in `src/app/(public)/layout.tsx` (one place, covers all public pages): `name`, `url`, `logo`, `description` from `siteConfig`. Add `sameAs` (social URLs) when handles exist — omitted for now.

3. **Event schema — per event.** In `src/app/(public)/events/[slug]/page.tsx`, render an `Event` JSON-LD built from the `EventRow` already fetched (no extra query): `name`, `description`, `startDate` (`scheduled_at`), `endDate` (`scheduled_at + duration_min`), `eventAttendanceMode: OnlineEventAttendanceMode`, `eventStatus: EventScheduled`, `location: { @type: VirtualLocation, url }`, `organizer` (Organization + `host_name`), `image` (cover image or OG URL), `offers` (price 0 — free).

4. **(Optional, low priority) `BreadcrumbList`** on event pages: Home › Events › <title>. Only if time allows.

---

## Workstream 3 — AI visibility (`llms.txt`)

**Create `src/app/llms.txt/route.ts`** — a `GET` handler returning `Content-Type: text/markdown` so it can include **live events** (a static `public/llms.txt` would go stale). Follows the llms.txt convention: H1 title, blockquote summary of what Empowered Careers is, then link sections with descriptions:

- **Primary** — `/` (what EC is), `/events`, `/about`, `/login` (signup).
- **Upcoming sessions** — published, non-past events with title + date + URL (anon Supabase read, same helper as sitemap).
- `export const revalidate = 3600`.

Mirror the sitemap's anon-client read so both stay in sync. Defer `llms-full.txt` (wants long-form content → tied to the deferred blog).

---

## Out of scope (deferred)

- **Blog/content engine** (MDX vs Sanity/Contentful) — pending decision. When chosen: add a `blogPosts()` reader and append its entries to `sitemap.ts` and `llms.txt` (one line each); add `Article` JSON-LD per post.
- Programmatic acquisition/landing pages — doesn't fit the closed-loop model.

---

## Files

**Modify:** `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/layout.tsx`, `src/app/(public)/layout.tsx`, `src/app/(public)/events/[slug]/page.tsx`, `env.ts`, the four static `(public)` stub pages (canonical only), possibly `src/config/site.ts` (add `logo` path + optional social handles).

**Create:** `src/components/seo/json-ld.tsx`, `src/app/manifest.ts`, `src/app/llms.txt/route.ts`, possibly `src/lib/supabase/anon.ts` (cookieless anon client shared by sitemap + `llms.txt`).

---

## Verification

1. `npm run type-check` and `npm run build` clean.
2. Dev server: load `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, `/llms.txt` — confirm public pages + published events appear, and `/dashboard`/`/admin`/`/employer` are **absent** from sitemap and **present** in robots `disallow`.
3. View source on a published `/events/[slug]` — confirm `Event` + `Organization` JSON-LD blocks present; `<link rel="canonical">` points to the clean slug (no `?src=`); OG image URL is event-specific.
4. Paste an event URL's rendered HTML into Google's Rich Results Test / schema.org validator — `Event` validates with no errors.
5. Hit `/events/<slug>?src=linkedin` — confirm canonical still resolves to the un-tagged URL.
6. Confirm an unpublished event 404s and does **not** appear in sitemap or `llms.txt`.

---

## Open items to confirm at implementation time

- Existing icon assets in `public/` (determines how complete `manifest.ts` can be).
- Production value for `NEXT_PUBLIC_SITE_URL` and the Google Search Console verification token.
