# Coaching/Content Pivot — Implementation Plan

> Companion to `docs/ec-pivot-brief.md` (GT). The brief sets direction and build
> order; this doc is the reconciliation against the actual repo and the live
> Supabase schema, plus the decisions resolved since.
>
> Verified 2026-08-05 against project `wpurdayfjsyiedabmipt` and `main` @ `ff089d5`.
> Nothing here supersedes the brief's intent — it fills in what the brief
> assumed, corrects two assumptions, and re-sequences around what's blocked.

---

## 0. State of the world, verified

**No schema drift.** `coaching_products`, `enrollments`, `coaching_sessions`
match `docs/db_schema.md` exactly. `coaches` and `jds` do not exist, as the
brief assumes.

**The coaching catalog is empty.** `coaching_products` = 0 rows,
`enrollments` = 0, `coaching_sessions` = 0, `payments` = 0. Consequences:

- §2's "backfill `kind` on existing rows / Lauren to classify current catalog"
  is a **no-op**. There is nothing to classify. `not null default 'service'`
  is safe.
- Every taxonomy or column decision on `coaching_products` is free right now
  and expensive after Lauren populates it. Make them in this pass.

**Job-board data exists** (10 jobs, 1 application, 1 non-free profile) —
consistent with "dormant, not deleted."

**Inngest is real** — `inngest ^4.4.0`, `src/inngest/client.ts`,
`src/app/api/inngest/route.ts`, and two functions (`parse-resume.ts`,
`parse-linkedin.ts`). Both are AI parsing jobs. **There are no scheduled
functions yet**, so §6's inactivity cron is the first one — budget for the
setup, not just the rule.

**Correction to an earlier read of mine:** `/checkout/success` and
`/checkout/cancel` **do** exist, at `src/app/(app)/checkout/`. The route group
doesn't affect the URL, so both resolve. Not a blocker.

---

## 1. Blockers the brief doesn't account for

These sit underneath §3 and must land in the §2 migration.

### B1 — Admin cannot write `coaching_products` (RLS)

The only policy on the table is:

```
coaching_products: read by authenticated   SELECT   (auth.uid() IS NOT NULL)
```

No INSERT, no UPDATE. `createCoachingProduct` / `updateCoachingProduct`
(`src/app/actions/admin.ts:398,417`) go through the user-session server client,
not the service role, so every write is rejected. This is almost certainly why
the table is empty. **§3's exit criterion — "Lauren can populate the catalog" —
is unreachable until this is fixed.**

### B2 — Anonymous visitors cannot read the catalog

Same policy requires `auth.uid() IS NOT NULL`. §1 rebuilds `/pricing` to render
`coaching_products`; the public homepage block (`HomePricing.tsx`) is also
anon-facing. Both render empty for logged-out visitors. Needs a public read
policy scoped to `is_active = true`.

### B3 — No `stripe_price_id` in the admin form

`CoachingProductInput` (`src/app/actions/admin.ts:390`) carries
`name / type / description / price_cents / external_url / is_active`. There is
no way to attach a Stripe price from the UI, and `assertAllowedPriceId`
(`src/lib/stripe/validate.ts:23`) authorizes checkout purely on
`coaching_products.stripe_price_id`. Nothing is purchasable until the field
exists.

### B4 — Enrollment inserts are not idempotent

`handleCheckoutCompleted` (`src/lib/stripe/webhook-handlers.ts:137`) does a bare
`insert` into `enrollments`. `payments` is protected by a unique constraint on
`stripe_payment_intent_id` and the handler swallows `23505`; `enrollments` has
no such constraint. Stripe redelivery is idempotent at the event level
(`stripe_webhook_events`), but a handler that throws _after_ the enrollment
insert gets retried and duplicates the row. Bundle fan-out (§3) multiplies this
by N. Fix with `unique (profile_id, product_id)` + ignore-on-conflict.

---

## 2. Decisions resolved

| Decision                                | Resolution                                                                                                                                                                                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bundle → multiple enrollments?          | **Yes, via a `bundle_contents` join table.** One Stripe line item, N enrollment rows. Referential integrity, supports editing bundle composition in admin later.                                                                         |
| `coaching_products.type` vs new `kind`  | **Drop `type`, keep `kind`.** `kind` (`course/session/service/bundle`) supersedes `type` (`module/session_pack/one_to_one`). One taxonomy. Free to do now — the table is empty.                                                          |
| What is `docs/prototypes/pricing.html`? | **It is the platform catalog.** The 3 bundles + 8 quick-adds get built into `coaching_products` as real rows. The 22-deliverable breakdown table is display copy only — not individually purchasable.                                    |
| §9 catalog naming                       | **Keep the tier names, drop the umbrella.** Foundation / Momentum / Executive and the 8 quick-add names ship verbatim; the "Career Symmetry 360" wrapper name does not appear in the platform. Silver/Gold/Platinum stay as tier labels. |
| Catalog placement                       | **Move `/pricing` into `(public)`, anon-visible.** Gains the marketing Navbar/Footer, drops the `/login` bounce; checkout prompts for login at click time. Depends on the B2 anon-read policy.                                           |
| D2 — course hosting                     | **Simple in-house, unlisted Vimeo/YouTube embed** + `enrollments.progress`. No Mux, no Kajabi. Access control is by URL obscurity.                                                                                                       |
| D2 — booking                            | **Cal.com, one shared account with per-event links.** See the schema consequence below.                                                                                                                                                  |
| §4 free ATS cap                         | **5 per month**, counted on `jds` where `source='free'` in the current calendar month.                                                                                                                                                   |

### Schema consequence of the booking decision

The brief's DDL puts `cal_link` on `coaches`. With **one shared Cal.com account
and a booking link per event type**, the link belongs to the _product_, not the
coach — two products delivered by the same coach need different links.

- `coaches` keeps `name / bio / specialty / avatar_url / is_mentor / active`
  (it still drives the coach card on `kind='session'` products) but **drops
  `cal_link`**.
- `coaching_products` gains `booking_url text` for `kind='session'`.
- `external_url` (already exists) becomes the **course video embed URL** for
  `kind='course'`. Two columns with distinct meanings beats overloading one.

### Still open — not blocking code

| #   | Item                                                                          | Needed for            |
| --- | ----------------------------------------------------------------------------- | --------------------- |
| D3  | Content engine: MDX-in-repo vs external CMS                                   | deferred per brief §7 |
| ops | 11 Stripe Products + one-time Prices, IDs pasted into admin                   | §3 data entry         |
| ops | Cal.com event-type URLs per session product; API key + webhook signing secret | §5 booking            |
| ops | Coach rows for Whitney + Lauren (bio, specialty, avatar)                      | §5 coach cards        |
| ops | Course video URLs                                                             | §5 course delivery    |

None of these block the build — they are data the surfaces read once it exists.

---

## 3. §1 splits in two

The brief calls §1 "small, do first, unblocks everything else." Half of it is —
the other half depends on §3's catalog, which depends on the naming decision.

### §1a — Unlink and strip — ✅ DONE

Shipped as described below, plus four cascades the audit surfaced once the
plan-based code started coming out:

- `getProfileStrength` step 7 was "subscription active" and
  `buildProfileSteps` had `step-subscription` → "Activate membership" → `/pricing`.
  Both were **permanently unreachable** under à la carte, so the ring capped at
  6/7 and `nudge-profile` would have nagged forever. Step removed, `total` → 6,
  points rebalanced to still sum to 100.
- `QuickActions` and `JobBoardTeaser` **deleted**. Both were mocks: the teaser
  rendered hardcoded fake jobs behind two buttons with no href or onClick, and
  QuickActions' only working state (`no-resume` → upload) is unreachable because
  `dashboard/page.tsx:90` hard-gates the dashboard on having a resume. Their two
  live states were job-board upsells. §6 replaces the slot with prescription
  nudges.
- `isPaidUser` removed — zero consumers after the above. A comment in
  `use-dashboard-data.ts` marks it as intentionally gone so it isn't
  reintroduced as a plan check.
- `activeJobCount` plumbing removed end to end (dashboard page fetch, the
  `useDashboardData` hook fetch, `DashboardClientProps`, `ComputeNudgesInput`),
  along with the "Active matches" StatCard it fed. The dashboard no longer
  queries the `jobs` table at all.

**Not yet met:** the §1 exit criterion says a fresh signup never encounters
"Core" or "Pro". Inside the app that now holds. **The public homepage still
does** — `HomePricing.tsx` renders the Core/Pro tiers at `#pricing`, which is
where `Navbar.tsx:57` and `Footer.tsx:45` point. That is §1b, blocked behind the
§2/§3 catalog.

Original scope:

| File                                                              | Change                                                                                                                                                                                                   |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/app-shell/sidebar-config.ts:135`                  | Remove the Job Board entry from `topNavTabs` (the primary nav link, rendered by `top-nav.tsx:70-86`). Leave `sidebarConfig["/job-board"]` at `:92-109` — only reachable once you're already on the path. |
| `src/app/(app)/layout.tsx:69-75`                                  | The sidebar profile chip renders literally `"Pro"` / `"Core"` / `"À la carte"` on **every** authenticated page. Primary violation of the §1 exit criterion.                                              |
| `src/components/dashboard/dashboard-client.tsx:180`               | Remove `<JobBoardTeaser>`. Note it renders hardcoded fake jobs (`job-board-teaser.tsx:22-47`) behind two buttons with no href or onClick — it is a mockup, not a working feature.                        |
| `src/components/pipeline/pipeline-client.tsx:76`                  | Empty state links `/job-board`.                                                                                                                                                                          |
| `src/lib/dashboard/steps.ts:86`, `src/lib/dashboard/nudges.ts:88` | `/pricing` CTAs — neutralize now, retarget in §6.                                                                                                                                                        |
| `CLAUDE.md:7`, `docs/context.md:25-45,195-205`                    | Both still state the subscription model as canonical. Update or the next session rebuilds what we just hid.                                                                                              |

**Already satisfied, no work needed:**

- `tier-locked-banner.tsx` — sole usage is `job-board-client.tsx:155`. Dies with the board.
- `/billing` — already orphaned; the top-nav "Billing" item (`top-nav.tsx:133`) is a `DropdownMenuItem` with no `Link`.
- `is_paid_subscriber()` — zero call sites in app code; generated type only.
- `canSeeJobTier` — all four call sites are inside `/job-board/*`. Unreachable once unlinked, function left intact per the brief.
- `robots.ts:9` already disallows `/job-board`.
- No middleware or `(app)` layout plan gate exists. All plan enforcement is per-page inside the board.

**Two items the exit criterion requires but §1 doesn't list:**

1. **`HomePricing.tsx`** renders Core/Pro on the public homepage
   (`src/app/(public)/page.tsx:15`), and `Navbar.tsx:57` / `Footer.tsx:45` link
   `#pricing` to it. A fresh visitor meets Core/Pro _before_ signup. Blocked on
   the same naming decision as `/pricing` → goes in §1b.
2. **`isPaidUser`** (`src/hooks/use-dashboard-data.ts:101-104`) currently means
   `plan !== 'free'`, and drives `dashboard-header.tsx:38,58` and
   `quick-actions.tsx:33-34,60,84,89`. Under "no subscriptions" it must mean
   _"has an active enrollment."_ That is a rewrite against a new data source,
   not an unlink — moved to §3 where `enrollments` becomes the entitlement
   source of truth.

**Unrelated bug found:** `nudge-content` (`nudges.ts:92`) CTAs to `/insights`,
which does not exist in the repo. Fix while retargeting in §6.

### §1b — Pricing rebuild (unblocked; depends on §2 landing first)

Move `src/app/pricing/page.tsx` into `(public)` so it inherits the marketing
Navbar/Footer, and drop the `pricing-plans.tsx:26` bounce to
`/login?next=/pricing` — checkout prompts for login at click time instead.

Replace `PRICING_TIERS` (`src/config/pricing.ts`) with a DB-driven catalog:
active `coaching_products` grouped by `kind`, coach card rendered when
`kind = 'session'`. `HomePricing.tsx` and `/pricing` share the one component;
`Navbar.tsx:57` / `Footer.tsx:45` keep pointing at `#pricing` on the homepage.

Layout follows `docs/prototypes/pricing.html`: the three bundles as tier cards, the eight
quick-adds as a table, and the 22-deliverable breakdown as static comparison
copy. Only the 11 bundle/quick-add rows are purchasable — the 22 deliverables
are marketing detail with reference prices, not `coaching_products` rows.

Delete-on-sight while here: `src/components/landing/PricingTeaser.tsx` has zero
imports anywhere.

---

## 4. §2 — the migration

Brief's DDL is correct as written. Add to the same migration:

```sql
-- B1/B2: coaching_products RLS
create policy "coaching_products: public read active" on coaching_products
  for select to anon, authenticated using (is_active);
create policy "coaching_products: admin write" on coaching_products
  for all using (is_admin()) with check (is_admin());

-- Decision: kind supersedes type
alter table coaching_products drop column type;
drop type coaching_product_type;

-- Bundle fan-out
create table bundle_contents (
  bundle_id  uuid references coaching_products(id) on delete cascade not null,
  product_id uuid references coaching_products(id) on delete restrict not null,
  primary key (bundle_id, product_id)
);

-- Booking: shared Cal.com account, link per event type (per product, not per coach)
alter table coaching_products add column booking_url text;

-- B4: enrollment idempotency
alter table enrollments add constraint enrollments_profile_product_key
  unique (profile_id, product_id);
```

Plus `coaches` (public read `active = true`, admin write) and `jds`
(owner-only, mirroring the `resumes` pattern) per the brief.

**Follow-on code, same PR:**

- `src/types/db.ts` — add `CoachRow`, `JdRow`, `EnrollmentRow`,
  `CoachingProductKind`; remove `CoachingProductType`. Per house rule, these
  land in `db.ts` before any call site derives them inline.
- `CoachingProductInput` + `coaching-product-form.tsx` — swap `type` for
  `kind`, add `stripe_price_id` (B3) and `coach_id`.
- `inferProductType` (`webhook-handlers.ts:73`) keys off product _name_, not
  `type`, so dropping the column doesn't touch it. Its keyword matches
  (`resume` / `linkedin` / `interview` → typed, else `coaching`) still work
  against the new catalog.
- Run `npm run supabase:types`, then `get_advisors` (security) to confirm no
  missing RLS on `jds` / `coaches` / `bundle_contents`.

---

## 5. §3 — catalog and fan-out

Unblocked once §2 lands, except for naming.

- Extend `handleCheckoutCompleted` (`webhook-handlers.ts:98`): after resolving
  the product, if `kind = 'bundle'`, read `bundle_contents` and insert one
  enrollment per contained product **plus** one for the bundle itself (so
  "what did they buy" and "what can they access" are both answerable). Ignore
  `23505` throughout, per B4.
- Redefine `isPaidUser` against `enrollments`, and update its four consumers.
- Content/course gating queries `enrollments` only. No plan check anywhere in
  this path — `comparePlans` stays confined to `webhook-handlers.ts:214`.

Everything else in the payment path is already code-complete for this exact
flow: `assertAllowedPriceId` → `mode: 'payment'` → `payments` row +
`enrollments` row + Loops + notification, **no plan change**
(`webhook-handlers.ts:94-96` documents this explicitly).

---

## 6. Revised build order

Every decision is resolved, so nothing is gated on an answer any more — only on
ordering. Each step below is buildable the moment the one above it lands.

```
1a — Strip/unlink job-board + Core/Pro from candidate UI
2  — Migration: coaches, jds, kind/coach_id, booking_url,
     bundle_contents, B1–B4 fixes, db.ts aliases, admin form fields
3  — Catalog rows + bundle fan-out + enrollment entitlement
1b — /pricing into (public) + HomePricing, DB-driven
5  — Coaching delivery: My Coaching, course player, Cal.com webhook,
     wire the two TODO stubs
4  — JD → ATS checker, 5/month free cap
6  — Nudges + prescription engine + inactivity cron
```

§5 still splits usefully, now by ops readiness rather than by decision: the
**"My Coaching" card + enrollment list + the two `TODO(coaching)` stubs**
(`resume-client.tsx:411`, `linkedin-client.tsx:281`) + the admin per-candidate
enrollment view need only `enrollments`, so they ship first. The course player
needs video URLs and the Cal.com webhook needs a signing secret — both can be
built against empty data and lit up when the ops inputs arrive.

§6 inventory: 7 Loops wrappers exist today (`fireLeadRegistered`,
`fireLeadAttended`, `fireLeadConverted`, `fireCandidatePayment`,
`fireCandidatePlanUpgraded`, `fireAssessmentStarted`, `fireAssessmentCompleted`).
The pivot needs 7 more (`signup`, `resume_uploaded`, `inactive_7d`,
`inactive_30d`, `course_purchased`, `session_booked`, `enrollment_completed`).
Existing nudge rules to retarget: `nudge-resume-score` (:108),
`nudge-plan` (:84, currently gated on `activeJobCount > 0`),
`nudge-content` (:92, broken `/insights` link).

---

## 7. Verification

No test framework in this repo. Per step:

- **1a** — `npm run type-check && npm run check`; fresh signup walkthrough on
  the dev server confirming the words "Core", "Pro", and "job board" appear
  nowhere in linked candidate nav.
- **2** — apply to a Supabase branch first; `get_advisors` clean; re-run
  `npm run supabase:types` and confirm a clean type-check (dropping `type` will
  surface every stale reference).
- **3** — Stripe CLI `stripe listen --forward-to localhost:3000/api/stripe/webhook`,
  test-card purchase of (a) one `kind='session'` product and (b) one bundle.
  Assert: correct `payments` row (`billing_reason='one_time'`), N+1 enrollments
  for the bundle, `profiles.plan` **unchanged**, and a replayed webhook event
  producing no duplicate rows.
