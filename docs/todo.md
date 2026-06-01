# TODO — manual steps after resume + LinkedIn pipeline build

Post-it. Tell Claude when each is done; Claude verifies and removes the line.

## Blocking (pipelines won't work without these)

- [ ] Add `ANTHROPIC_API_KEY=...` to `.env.local`
- [x] Sign up at inngest.com, create app `empowered-careers`. Local dev needs nothing else; prod needs `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` in `.env.local` and on the deploy host

## Admin substrate + job board (post-S2)

- [ ] In Supabase Studio: `update profiles set role = 'admin' where id = '<lauren-auth-uid>';`
- [ ] Sign in as Lauren, visit `/admin/jobs`, seed 10–15 Tier 1 roles
- [ ] Smoke test the candidate loop: sign in as a `plan='free'` test user, visit `/job-board`, bookmark a card, click Express interest, confirm the consent modal, then visit `/pipeline` and see the card in the Interested column
- [ ] Adversarial RLS check via Supabase Studio with a candidate JWT: `insert into jobs ...` blocked, `select * from applications where profile_id != auth.uid()` blocked, `update applications set status='offer' where id=<own row>` blocked

## Local smoke test

- [ ] Terminal 1: `npm run inngest:dev` (Inngest dev server on `localhost:8288`)
- [ ] Terminal 2: `npm run dev`
- [ ] Upload a known-good PDF resume, watch the run in the Inngest GUI — each step should go green; `resumes` row flips `uploading → processing → complete`, `ats_score` populated
- [ ] Re-upload the same PDF — toast says "Resume already on file", no Claude calls fire (Inngest GUI shows no new run)
- [ ] Upload a different PDF — first row flips `is_current=false`, `superseded_at` stamped; second row is `is_current=true`
- [ ] **LinkedIn:** with `profiles.linkedin_url` set, the Profile Strength card now shows a "Score your LinkedIn profile" section. Upload a LinkedIn "Save to PDF" export — Inngest GUI shows `parse-linkedin` run, each step green
- [ ] LinkedIn row check: `linkedin_profiles.status` goes `idle → processing → complete`, `parsed_json` populated, `summary`/`profile_score` denormalized. **Critical:** `linkedin_url`, `headline`, `raw_json` (OAuth fields) are UNTOUCHED — diff before/after
- [ ] Re-upload the same LinkedIn PDF — toast "LinkedIn export already on file", no Claude run
- [ ] As a user who added `linkedin_url` via the dialog (no LinkedIn OAuth), confirm uploading a PDF works — action upserts the row from `profiles.linkedin_url`; no "Connect LinkedIn first" dead-end

## Production deploy

- [ ] Register Inngest endpoint in the Inngest dashboard: `https://<your-domain>/api/inngest` — confirm green sync status
- [ ] Verify env vars (`ANTHROPIC_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `SUPABASE_SECRET_KEY`) set on the host

## SEO + AI visibility (post `ec-seo-visibility-plan.md`)

- [ ] Set `NEXT_PUBLIC_SITE_URL=https://<prod-domain>` on the deploy host (sitemap, llms.txt, JSON-LD, canonicals all derive URLs from this)
- [ ] Get the Google Search Console verification token and set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` on the deploy host; verify the site in Search Console and submit `/sitemap.xml`
- [ ] Drop proper PWA icons into `public/`: `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — then extend `src/app/manifest.ts` to reference them (currently only points at `/favicon.ico`)
- [ ] Add a real `Organization.logo` PNG (e.g. `public/logo.png`) and update `siteConfig.logo` — JSON-LD currently points at `favicon.ico` as a placeholder
- [ ] When the blog content engine ships (MDX vs Sanity/Contentful), extend `src/app/sitemap.ts` and `src/app/llms.txt/route.ts` with a `blogPosts()` reader, and add `Article` JSON-LD per post
- [ ] Manual verification once `NEXT_PUBLIC_SITE_URL` is set in prod:
  - [ ] Load `/sitemap.xml` and `/llms.txt` — confirm public pages + published events appear, `/dashboard`/`/admin`/`/employer` are absent
  - [ ] Load `/robots.txt` — confirm all private prefixes in `disallow`
  - [ ] Load `/manifest.webmanifest` — confirm name/short_name/icons
  - [ ] View source on a published `/events/[slug]` — confirm `Event` + `Organization` JSON-LD present; `<link rel="canonical">` clean (no `?src=`); OG image is event-specific
  - [ ] Paste rendered HTML into Google Rich Results Test / schema.org validator — `Event` validates with no errors
  - [ ] Hit `/events/<slug>?src=linkedin` — canonical resolves to un-tagged URL
  - [ ] Confirm an unpublished event 404s and does not appear in sitemap or `llms.txt`

## Optional / later

- [ ] Place ≥5 PDF fixtures in `evals/parser/fixtures/` with ground-truth JSON in `evals/parser/ground-truth/`, then `npm run eval:parser`
- [ ] Fill `evals/scorer/pairs.json` with hand-ranked pairs, then `npm run eval:scorer`
- [ ] Place ≥5 LinkedIn PDF fixtures in `evals/linkedin-parser/fixtures/` with ground truth in `evals/linkedin-parser/ground-truth/`, then `npm run eval:linkedin-parser`
- [ ] Fill `evals/linkedin-scorer/pairs.json`, then `npm run eval:linkedin-scorer`
- [ ] Stale-`uploading` / stale-`processing` watchdog: extend `useResumeNotifications` and `useLinkedinNotifications` to flag rows stuck >60s as failed (covers silent `inngest.send` failures the user navigates away from)
- [ ] Loops integration: subscribe to `candidate/resume_parsed` and `candidate/linkedin_parsed` events (already emitted) for the corresponding emails
- [ ] Surface the LinkedIn `profile_score` in the Profile Strength card once it's computed (today the upload UI shows but the score badge does not — needs a small dashboard query addition)
