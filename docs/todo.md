# TODO — manual steps after resume + LinkedIn pipeline build

Post-it. Tell Claude when each is done; Claude verifies and removes the line.

## Blocking (pipelines won't work without these)

- [ ] Add `ANTHROPIC_API_KEY=...` to `.env.local`
- [ ] Sign up at inngest.com, create app `empowered-careers`. Local dev needs nothing else; prod needs `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` in `.env.local` and on the deploy host

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

## Optional / later

- [ ] Place ≥5 PDF fixtures in `evals/parser/fixtures/` with ground-truth JSON in `evals/parser/ground-truth/`, then `npm run eval:parser`
- [ ] Fill `evals/scorer/pairs.json` with hand-ranked pairs, then `npm run eval:scorer`
- [ ] Place ≥5 LinkedIn PDF fixtures in `evals/linkedin-parser/fixtures/` with ground truth in `evals/linkedin-parser/ground-truth/`, then `npm run eval:linkedin-parser`
- [ ] Fill `evals/linkedin-scorer/pairs.json`, then `npm run eval:linkedin-scorer`
- [ ] Stale-`uploading` / stale-`processing` watchdog: extend `useResumeNotifications` and `useLinkedinNotifications` to flag rows stuck >60s as failed (covers silent `inngest.send` failures the user navigates away from)
- [ ] Loops integration: subscribe to `candidate/resume_parsed` and `candidate/linkedin_parsed` events (already emitted) for the corresponding emails
- [ ] Surface the LinkedIn `profile_score` in the Profile Strength card once it's computed (today the upload UI shows but the score badge does not — needs a small dashboard query addition)
