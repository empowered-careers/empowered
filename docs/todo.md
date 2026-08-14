# TODO — manual steps after resume + LinkedIn pipeline build

Post-it. Tell Claude when each is done; Claude verifies and removes the line.

## Blocking (pipelines won't work without these)

- [ ] Add `ANTHROPIC_API_KEY=...` to `.env.local`
- [x] Sign up at inngest.com, create app `empowered-careers`. Local dev needs nothing else; prod needs `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` in `.env.local` and on the deploy host

## Admin substrate + job board (post-S2)

- [x] In Supabase Studio: `update profiles set role = 'admin' where id = '<lauren-auth-uid>';`
- [x] Sign in as Lauren, visit `/admin/jobs`, seed 10–15 Tier 1 roles
- [x] Smoke test the candidate loop: sign in as a `plan='free'` test user, visit `/job-board`, bookmark a card, click Express interest, confirm the consent modal, then visit `/pipeline` and see the card in the Interested column
- [ ] Adversarial RLS check via Supabase Studio with a candidate JWT: `insert into jobs ...` blocked, `select * from applications where profile_id != auth.uid()` blocked, `update applications set status='offer' where id=<own row>` blocked

## Coaching schema — pivot step 2 (applied 2026-08-15, `docs/ec-pivot-plan.md` §4)

- [x] Migrations applied: `20260815000000_pivot_coaching_schema.sql` + `20260815000001_coaching_catalog_seed.sql`. Schema, RLS, anon read, and enrollment idempotency all verified against the live project.
- [ ] **Blocking for any purchase:** create 11 Stripe Products + one-time Prices (sandbox), then paste each price ID into `/admin/coaching` → Edit. Every row shows "No Stripe price" until you do. Amounts to match: Foundation $450, Momentum $1,400, Executive $2,400, Resume Refresh $125, LinkedIn Glow-Up $150, NorthStar Discovery $175, Market Intel Session $175, Mock Interview $200, Executive Bio $250, Background & Social Prep $200, 90-Day Check-In $150.
- [ ] Insert `coaches` rows for Whitney + Lauren (name, bio, specialty, avatar_url) via Supabase Studio — there is deliberately no admin CRUD for coaches yet, and the Coach select on session products is empty until rows exist.
- [ ] Signed in as Lauren, `/admin/coaching`: create a `kind='session'` product and then edit it. This is the proof B1 is fixed — before the migration every write was silently rejected by RLS.

### Coaching delivery — ops inputs (§5 shipped 2026-08-15, surfaces render empty until these land)

- [ ] `CAL_WEBHOOK_SECRET` in `.env.local` + on the deploy host, and a Cal.com webhook subscribed to `BOOKING_CREATED` / `BOOKING_RESCHEDULED` / `BOOKING_CANCELLED` pointing at `https://<domain>/api/cal/webhook`. Until it's set the route 503s and bookings aren't recorded.
- [ ] Per-session-product Cal.com event-type URLs pasted into `coaching_products.booking_url` via `/admin/coaching`. **Make each event-type slug distinct** — booking→enrollment matching keys on the slug appearing in `booking_url`, and two products whose slugs are substrings of each other resolve to "ambiguous" and get dropped rather than guessed.
- [ ] Course video URLs into `coaching_products.external_url` for any `kind='course'` row. The player shows "not published yet" without them. There are no course rows in the seeded catalog yet — add them via `/admin/coaching` when the content exists.
- [ ] `ANTHROPIC_API_KEY` in `.env.local` — still unset, which blocks Big Wins and the §4 ATS checker from actually running.

### Pricing questions for Lauren (from auditing `docs/prototypes/pricing.html`)

None of these block the schema — the seeded rows use the quick-add menu prices, which
are the right source for purchasable SKUs. They block `/pricing` copy (§1b) and the
bundle fan-out (§3).

- [ ] **Momentum's advertised à la carte value is wrong.** Summing the deliverables dotted into Gold gives **$2,375**; the card says **$2,250**. Silver ($525) and Platinum ($3,700) both check out exactly, so the method is right and Gold is off by $125. Two candidates, both $125 items: "Market trends briefing" (module 04) and "Interview prep checklist" (module 05). Either one is wrongly dotted into Gold, or the total is stale. Which?
- [ ] **The quick-add menu and the 22-deliverable table are two different price lists, not a subset relationship.** Same-named items disagree (Resume Refresh $125 vs "Repackaged resume" $150; LinkedIn Glow-Up $150 vs "LinkedIn brand build" $175; 90-Day Check-In $150 for one session vs "First 90 days check-ins" $225 for three), and two quick-adds are coarse repackagings with no single counterpart (NorthStar Discovery $175 covers five module-01 rows worth $750; Market Intel Session $175 covers three module-04 rows worth $450). Which list is real?
- [ ] **Consequence of the above — the "à la carte value" savings aren't reachable.** Foundation's three deliverables are $525 at table prices but **$475** as quick-adds, so the actual saving vs. what a customer can buy is $25, not $75. Momentum's five mapped quick-adds total **$825** against an advertised $2,250–2,375. Decide whether the comparison copy uses table prices (aspirational) or quick-add prices (honest) before `/pricing` ships.
- [ ] **Consequence for the §3 fan-out.** A Momentum purchase fanning out to its five `bundle_contents` quick-adds grants ~$825 of SKUs for a $1,400 purchase. The bundle's own enrollment row has to carry the real entitlement — the fan-out can't be the whole story.
- [ ] **Session counts vs deliverables:** the tiers advertise 3 / 8 / 13 sessions but the dots include 3 / 15 / 22 deliverables, and only 3 / 5 / 8 map to a named quick-add. `bundle_contents` encodes the mapped ones; the unmapped remainder is Mindset Mastery (3 rows) and Seamless Start (1 row). Correct, or should those become SKUs too?
- [ ] **GT: the marketing homepage still sells a job board and a subscription.** `/pricing` and the homepage pricing block are now coaching-only and DB-driven, but the surrounding landing copy isn't: `Hero.tsx:23` "That Never Hit Job Boards", `Features.tsx:15` "No public job board spam…", `HowItWorks.tsx:15` "**Subscribe** to unlock roles that never hit public job boards", `CTASection.tsx:27` "the job board noise". This is the §1 exit criterion ("a fresh signup never encounters the words Core, Pro, or job board") and it needs your voice, not invented copy. Nothing else in the app or on `/pricing` violates it any more.
- [ ] Three copy inconsistencies for `/pricing` (§1b): the tier cards file "First 90 days check-ins" under Seamless Start while the table files it under Distinguished Dialogues; the Momentum bullet lists four of module 01's five items; and the footer sells a "15-minute Career Capital Assessment" — a fourth assessment name alongside Career Identity Blueprint and Career Positioning Assessment. Also confirm the "Career Symmetry 360" umbrella stays out of the platform, per the resolved naming decision.

## Big Wins (code built 2026-08-14, `docs/big-wins-implementation-plan.md`)

> The seed migration **is applied** — `20260814000000_big_wins_assessment_seed` is in
> the remote migration list and the `Big Wins` assessments row exists. What's actually
> blocking the walkthrough is that `resumes` has **0 rows** in this project, so there is
> no parsed resume for the gate to pass.

### Verification (needs a signed-in account with a parsed resume — upload one first)

- [ ] `/assessments` shows Big Wins as a **Live** card with the role count; `/resume` shows a "Rewrite with Big Wins" button on the work-experience block
- [ ] Complete two roles end to end. Skip a question; give one deliberately vague answer ("I helped improve onboarding") and confirm the dig-deeper nudge appears once and a second Next moves past it; use "answer more questions for this role" on the recap
- [ ] Check the written bullets invented **no** numbers the answers didn't contain, and kept hedges ("roughly 15%" stays "roughly")
- [ ] Reload `/assessments/big-wins` — stored bullets render with no new Claude call
- [ ] `/resume` shows rewritten bullets for the rewritten roles and the parser's originals for the rest
- [ ] **The one that matters:** re-upload the same resume and confirm the rewrite survives (bullets are keyed on `company|title`, not row order, and `parsed_json` is never written to)
- [ ] Edit a role's bullets in the recap, save, confirm `/resume` reflects the edit; then clear the box entirely and confirm the role reverts to its original resume bullets rather than rendering empty

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

- [x] Set `NEXT_PUBLIC_SITE_URL=https://<prod-domain>` on the deploy host (sitemap, llms.txt, JSON-LD, canonicals all derive URLs from this)
- [ ] Get the Google Search Console verification token and set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` on the deploy host; verify the site in Search Console and submit `/sitemap.xml`
- [ ] Drop proper PWA icons into `public/`: `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — then extend `src/app/manifest.ts` to reference them (currently only points at `/favicon.ico`)
- [ ] Add a real `Organization.logo` PNG (e.g. `public/logo.png`) and update `siteConfig.logo` — JSON-LD currently points at `favicon.ico` as a placeholder
- [ ] When the blog content engine ships (MDX vs Sanity/Contentful), extend `src/app/sitemap.ts` and `src/app/llms.txt/route.ts` with a `blogPosts()` reader, and add `Article` JSON-LD per post
- [x] Manual verification once `NEXT_PUBLIC_SITE_URL` is set in prod:
  - [x] Load `/sitemap.xml` and `/llms.txt` — confirm public pages + published events appear, `/dashboard`/`/admin`/`/employer` are absent
  - [x] Load `/robots.txt` — confirm all private prefixes in `disallow`
  - [x] Load `/manifest.webmanifest` — confirm name/short_name/icons
  - [x] View source on a published `/events/[slug]` — confirm `Event` + `Organization` JSON-LD present; `<link rel="canonical">` clean (no `?src=`); OG image is event-specific
  - [x] Paste rendered HTML into Google Rich Results Test / schema.org validator — `Event` validates with no errors
  - [ ] Hit `/events/<slug>?src=linkedin` — canonical resolves to un-tagged URL
  - [ ] Confirm an unpublished event 404s and does not appear in sitemap or `llms.txt`

## Paywall & Plans / Stripe (S3 — code shipped, `docs/done/ec-paywall-plan.md`)

> [!WARNING]
> **Subscription items below are dormant** after the coaching/content pivot.
> The four Core/Pro recurring prices and the Customer Portal stay configured
> (the code path is frozen, not deleted) but nothing sells them any more.
>
> The à la carte line — setting `coaching_products.stripe_price_id` — is the
> one that still matters, and it has grown into its own runbook:
> **`docs/ec-catalog-setup.md`**. Do that instead of the line below.

> Everything below runs in a **Stripe sandbox** (or legacy test mode) — test keys, test prices, `4242…` cards, no real charges. The app is env-driven and the API version is unpinned, so you just paste sandbox keys/price IDs into `.env.local`. Going live later = recreate prices in live mode and swap the env values.

### Blocking (payments won't work without these)

- [x] Stripe Dashboard: create 4 prices — Core monthly, Core quarterly, Pro monthly, Pro quarterly (verified: $19/mo, $49/qtr Core · $49/mo, $135/qtr Pro, all recurring)
- [x] Stripe Dashboard: create a webhook endpoint → `https://<prod-domain>/api/stripe/webhook`; subscribe to `checkout.session.completed`, `customer.subscription.created` / `.updated` / `.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- [x] Add to `.env.local` (+ deploy host): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_CORE_MONTHLY`, `STRIPE_PRICE_CORE_QUARTERLY`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_QUARTERLY`
- [ ] À la carte: set `coaching_products.stripe_price_id` (sandbox price IDs) for each active product via `/admin/coaching` — required for the one-time path (`assertAllowedPriceId` rejects unknown prices)
- [x] Stripe Dashboard → Settings → Billing → **Customer Portal**: activate/configure it in the same sandbox/test environment — `/api/stripe/portal` (the `/billing` "Manage subscription" + dashboard "Update card" buttons) errors until it's configured
- [x] Local dev: `stripe listen --forward-to localhost:3000/api/stripe/webhook`, copy the printed signing secret into `STRIPE_WEBHOOK_SECRET`

### Verification (Stripe sandbox or test mode, card `4242 4242 4242 4242`)

> Tip: use a **Test Clock** to fast-forward subscription renewals and cancel-at-period-end (the `subscription_cycle` / `subscription.deleted` steps) without waiting; `stripe trigger invoice.payment_failed` fires the failed-payment step.

- [x] Subscribe to Core monthly → `/checkout/success` → within 30s `plan='plan_2'`, `billing_cadence='monthly'`, `subscription_status='active'`; `payments` row `billing_reason='subscription_create'`; `/job-board` Tier 2 unlocked, Tier 3 still locked
- [x] Upgrade to Pro quarterly → `plan='plan_3'`, `billing_cadence='quarterly'`; Tier 3 visible
- [ ] À la carte one-time (e.g. Resume Review) → `payments` + `enrollments` rows written, `plan` stays `free`, `subscription_status` null
- [ ] Monotonic: Pro subscriber buys a one-time session → plan stays `plan_3`
- [ ] Cancel via `/billing` → Customer Portal → cancel at period end: `subscription_status='canceled'` immediately, `plan` stays until period end; after `subscription.deleted`, `plan='free'`, `billing_cadence=null`
- [ ] Failed payment (simulate `invoice.payment_failed`) → `subscription_status='expired'`, dashboard shows the "Payment failed — update card" banner
- [ ] Idempotency: replay the same `checkout.session.completed` twice → only one `payments` row; second delivery returns 200 instantly
- [ ] Security: bad signature → 400; no signature → 400; GET from browser → 405
- [ ] RLS (candidate JWT in Supabase Studio): `select * from payments where profile_id != auth.uid()` blocked; `insert into payments ...` blocked
- [ ] Loops: confirm `candidate.payment` + `candidate.plan_upgraded` events arrive in the Loops event log

### Decide before building bundled coaching (plan decision #7)

- [ ] Set Core/Pro price points + per-tier coaching-session counts ("X sessions / period")
- [ ] Spec the resetting-entitlement mechanics (counts, reset-on-renewal, tracking table) before building the subscription grant path — this is net-new code, not part of S3

## Optional / later

- [ ] Place ≥5 PDF fixtures in `evals/parser/fixtures/` with ground-truth JSON in `evals/parser/ground-truth/`, then `npm run eval:parser`
- [ ] Fill `evals/scorer/pairs.json` with hand-ranked pairs, then `npm run eval:scorer`
- [ ] Place ≥5 LinkedIn PDF fixtures in `evals/linkedin-parser/fixtures/` with ground truth in `evals/linkedin-parser/ground-truth/`, then `npm run eval:linkedin-parser`
- [ ] Fill `evals/linkedin-scorer/pairs.json`, then `npm run eval:linkedin-scorer`
- [ ] Stale-`uploading` / stale-`processing` watchdog: extend `useResumeNotifications` and `useLinkedinNotifications` to flag rows stuck >60s as failed (covers silent `inngest.send` failures the user navigates away from)
- [ ] Loops integration: subscribe to `candidate/resume_parsed` and `candidate/linkedin_parsed` events (already emitted) for the corresponding emails
- [ ] Surface the LinkedIn `profile_score` in the Profile Strength card once it's computed (today the upload UI shows but the score badge does not — needs a small dashboard query addition)
