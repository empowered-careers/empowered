# Open items

Everything unfinished, triaged into three kinds. A new owner needs to tell them apart:
some need a developer, some need someone with a vendor login, and some need a decision
from the business before any code can be right.

Source: [`../todo.md`](../todo.md), which stays as the raw running checklist. This is
the triaged view. Where they disagree, check `todo.md` — it's edited more often.

**Dates below are as of the last audit (2026-08-19 unless noted). Verify current state
before acting.**

---

## 🔴 The one that matters most

### The money path has never completed end to end

`payments` and `enrollments` were both **0 rows**. No à la carte checkout has ever
completed in any environment. Everything downstream — the purchase gate, entitlement
checks, JD quota, coaching access — is built on `enrollments` and therefore
**unverified**.

**Do this first.** Walk the flow in
[`local-setup.md`](local-setup.md#7-smoke-test-the-money-path-) with a `4242…` card.
Nothing else on this page is worth doing before you know the revenue path works.

---

## 1. Unfinished engineering

Needs a developer.

### Not verified end to end

- **Big Wins** (built 2026-08-14). Code exists, seed migration applied, but the flow
  has never been walked. Needs a signed-in account with a parsed resume. The one check
  that matters: **re-upload the same resume and confirm the rewrite survives** —
  bullets are keyed on `company|title`, not row order, and `parsed_json` is never
  written to. Also: skipped questions, the dig-deeper nudge on a vague answer,
  no invented numbers in generated bullets, hedges preserved ("roughly 15%" stays
  "roughly"), stored bullets re-render with no new Claude call, and clearing an edited
  bullet reverts to the parser's original rather than rendering empty.
  Spec: [`../big_wins_q&a.md`](../big_wins_q&a.md).

- **Adversarial RLS check.** Never run. With a candidate JWT in Supabase Studio,
  confirm: `insert into jobs …` blocked; `select * from applications where profile_id
!= auth.uid()` blocked; `update applications set status='offer'` on your own row
  blocked. RLS is the authorization model — this is worth an afternoon.

- **`/admin/coaching` write path.** Create a `kind='session'` product and then edit it.
  This is the proof that the RLS fix landed: before the migration, every admin write
  was silently rejected.

- **First `sweep-inactive` run** (07:00 UTC daily). No-ops until someone's last
  sign-in lands in the 7- or 30-day window. Nobody has watched one complete.

### Cheap, high-value improvements

- **Review candidate-facing prescription copy.** The `reason` strings in
  `src/lib/dashboard/prescribe.ts` are shown to candidates **verbatim** on the
  dashboard and have never been reviewed by anyone with voice authority.

### Deferred by design

Speced, deliberately not built. Each doc in [`../deferred/`](../deferred/) says why:
`career-blueprint-lead-magnet.md`, `ec-blog-mdx-plan.md`,
`ec-matching-implementation-plan.md`, `ec-matching-sprint-plan.md`, `ec-nudges-v2.md`,
`ec-pii-minimized-parsing.md`.

---

## 2. Ops steps not run

Needs a vendor login, not a developer.

### Blocking a live feature

- **`CALENDLY_WEBHOOK_SECRET` is unset**, locally and on the host. The route 503s, so
  **no booking has ever been recorded** into `coaching_sessions`. Candidates can book;
  the platform doesn't know. Subscribe a webhook to invitee created / rescheduled /
  cancelled at `https://<domain>/api/calendly/webhook`.

- **`LOOPS_API_KEY` is unset** and **no Loops sequences exist.** The app fires
  `candidate.signup`, `candidate.resume_uploaded`, `candidate.course_purchased`,
  `candidate.session_booked`, `candidate.enrollment_completed`, `candidate.inactive_7d`,
  `candidate.inactive_30d` (plus the `lead.*` and `assessment.*` events) — nothing
  sends until the sequences are created in Loops.

### Production environment parity

Verify each is set **in Vercel**, not only `.env.local`:

- [ ] `ANTHROPIC_API_KEY` — Inngest Cloud calls the Vercel function, so a local-only
      key means every production parse and score fails
- [ ] `SUPABASE_SECRET_KEY` — same reason
- [ ] `INNGEST_EVENT_KEY` — the endpoint sync proves only the _signing_ key is set;
      sending is a separate key. Without it, `inngest.send()` throws
- [ ] `NEXT_PUBLIC_SITE_URL` = the real domain — Stripe Checkout builds its
      success/cancel URLs from it

### Catalog and content

- **`coaches` is incomplete.** Lauren's row exists but `specialty` and `avatar_url`
  are null, and **Whitney has no row**. Insert via Supabase Studio — there is
  deliberately no admin CRUD for coaches.
- **No `kind='course'` rows exist**, and any that are added need a video URL in
  `coaching_products.external_url`. The player shows "not published yet" without one.

### SEO and assets

- [ ] `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` — get the token, set it on the host,
      verify in Search Console, submit `/sitemap.xml`
- [ ] Real PWA icons in `public/`: `icon-192.png`, `icon-512.png`,
      `apple-touch-icon.png`, then extend `src/app/manifest.ts` (currently only
      `/favicon.ico`)
- [ ] A real `Organization.logo` PNG and updated `siteConfig.logo` — JSON-LD currently
      points at `favicon.ico` as a placeholder

---

## 3. Business decisions

**No code can be correct until these are answered.** Don't guess.

### Pricing contradicts itself

Found by auditing `docs/prototypes/pricing.html` against the seeded catalog:

- **The quick-add menu and the 22-deliverable table are two different price lists**,
  not a subset relationship. Same-named items disagree: Resume Refresh $125 vs
  "Repackaged resume" $150; LinkedIn Glow-Up $150 vs "LinkedIn brand build" $175;
  90-Day Check-In $150 for one session vs "First 90 days check-ins" $225 for three.
  Two quick-adds have no single counterpart at all. **Which list is real?**

- **Momentum's advertised à la carte value is wrong.** Summing its dotted deliverables
  gives **$2,375**; the card says **$2,250**. Silver ($525) and Platinum ($3,700) check
  out exactly, so the method is right and Gold is off by $125. Two $125 candidates:
  "Market trends briefing" (module 04) and "Interview prep checklist" (module 05).
  **Which one is wrongly dotted, or is the total stale?**

- **The advertised savings aren't reachable.** Foundation's three deliverables are $525
  at table prices but **$475** as quick-adds — a real saving of $25, not $75.
  Momentum's five mapped quick-adds total **$825** against an advertised $2,250–2,375.
  **Does the comparison copy use table prices (aspirational) or quick-add prices
  (honest)?**

- **Consequence for the bundle fan-out.** A Momentum purchase fanning out to its five
  `bundle_contents` quick-adds grants ~$825 of SKUs for a $1,400 purchase. The
  bundle's own enrollment row has to carry the real entitlement — the fan-out can't be
  the whole story.

- **Session counts vs deliverables.** Tiers advertise 3 / 8 / 13 sessions but the dots
  include 3 / 15 / 22 deliverables, and only 3 / 5 / 8 map to a named quick-add.
  `bundle_contents` encodes the mapped ones; the remainder is Mindset Mastery (3 rows)
  and Seamless Start (1 row). **Correct, or should those become SKUs?**

- Three copy inconsistencies for `/pricing`: the tier cards file "First 90 days
  check-ins" under Seamless Start while the table files it under Distinguished
  Dialogues; the Momentum bullet lists four of module 01's five items; and the footer
  sells a "15-minute Career Capital Assessment" — a **fourth** assessment name
  alongside Career Identity Blueprint and Career Positioning Assessment. Also confirm
  "Career Symmetry 360" stays out of the platform.

### Entitlement scope

- **"Unlimited JD checks" currently means _holds any active enrollment_.** That was a
  developer judgement call, not a stated rule — so buying a $125 Resume Refresh today
  grants unlimited ATS checks forever. **Should it be a specific SKU, or time-boxed?**
  One line in `getJdQuota` either way.

### Assessment scoring

From `docs/README.md`, comparing the code against
`career-positioning-assessment.pdf`:

- **Tier cutoffs were loosely converted.** 30/72 (41.7%) became `<= 45`, and 51/72
  (70.8%) became `<= 72`. A candidate a hair into PDF-Tier-2 lands in code-Tier-1.
  **These two numbers decide which service tier the follow-up call pitches.**
  Intentional?

  (The underlying scoring change is _not_ in question — the PDF's "max 12 per category,
  72 total" is arithmetically wrong, since 1–5 scales max at 5 and MC at 4. The code
  normalises to percentages, which is correct.)

- **The PDF asks to A/B the lead-capture placement** (after Q2 vs. right before
  results). Code fixes it after Q2. Not built either: the optional per-category
  breakdown gated behind the booking.

### Marketing copy still sells the old product

The `/pricing` page and homepage pricing block are coaching-only and DB-driven, but the
surrounding landing copy isn't:

- `Hero.tsx` — "That Never Hit Job Boards"
- `Features.tsx` — "No public job board spam…"
- `HowItWorks.tsx` — "**Subscribe** to unlock roles that never hit public job boards"
- `CTASection.tsx` — "the job board noise"

This is the pivot's §1 exit criterion: _a fresh signup never encounters the words Core,
Pro, or job board._ **This needs GT's voice, not invented copy.** Nothing else in the
app violates it.

### Unresolved doc question

The relationship between the shipped Career Positioning Assessment and
`deferred/career-blueprint-lead-magnet.md` — which specs a public funnel over a
Blueprint question subset and is still marked "DO NOT implement yet" — is unresolved.
The pivot defers the public lead-magnet funnel again.

---

## Suggested order for a new owner

1. **Run the money path.** Everything else is built on it.
2. Set `CALENDLY_WEBHOOK_SECRET` — one variable unblocks a shipped feature.
3. Verify Vercel environment parity — silent production failures otherwise.
4. Run the adversarial RLS check.
5. Wire the `.check.ts` files into CI.
6. Get the pricing decisions answered before touching `/pricing` or `bundle_contents`.
7. Walk Big Wins end to end.
