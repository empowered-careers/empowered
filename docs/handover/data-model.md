# Data model

28 tables, 22 enums, 5 database functions, 2 storage buckets. All in Supabase
PostgreSQL with Row Level Security enforced at the database level.

- Column-level detail: [`../db_schema.md`](../db_schema.md)
- Generated types: `src/types/database.types.ts` (**never import directly**)
- Type aliases to import: `src/types/db.ts`
- Why half of this is dormant: [`dormant-surfaces.md`](dormant-surfaces.md)

---

## Tables by domain

### 🟢 Identity and intake — live

| Table                   | What it holds                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `profiles`              | One row per auth user. Role, name, LinkedIn, Stripe customer id, and the frozen `plan` column |
| `resumes`               | Uploaded resumes. `status`, `parsed_json`, `resume_score`, file hash, `is_current`            |
| `linkedin_profiles`     | Parsed LinkedIn PDF exports + `profile_score`                                                 |
| `candidate_preferences` | Onboarding survey answers                                                                     |

`profiles` is created by the `handle_new_user()` trigger on signup and kept in sync by
`handle_auth_user_updated()`. **Don't touch either trigger without sign-off.**

### 🟢 Assessments — live

| Table                  | What it holds                         |
| ---------------------- | ------------------------------------- |
| `assessments`          | The assessment definitions themselves |
| `assessment_responses` | A candidate's answers                 |
| `candidate_scores`     | Derived scores per candidate          |

Three assessments are seeded by migration: **Career Identity Blueprint**, **Big
Wins**, and **Role Clarity**. A fourth — the **Career Positioning Assessment** — is
public, pre-signup, and lives in code (`src/lib/assessment/career-positioning.ts`)
rather than in these tables; its results land on `leads`.

### 🟢 Commerce — live (but see the warning)

| Table                   | What it holds                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `coaching_products`     | The SKU catalog. `kind` ∈ `course` / `session` / `service` / `bundle`, plus `stripe_price_id` |
| `bundle_contents`       | Which products a bundle fans out to                                                           |
| `coaches`               | Coach profiles                                                                                |
| **`enrollments`**       | **The entitlement source of truth.** Written by the Stripe webhook                            |
| `coaching_sessions`     | Booked sessions, written by the Calendly webhook                                              |
| `payments`              | Payment records                                                                               |
| `stripe_webhook_events` | Raw events, for idempotency and debugging                                                     |

> ⚠️ `payments` and `enrollments` were both **0 rows** at last audit. No purchase has
> completed end to end. See [`open-items.md`](open-items.md).

`coaching_products.kind` is a **text column with a CHECK constraint**, not a Postgres
enum — it superseded a dropped `coaching_product_type` enum. The union lives in
`src/types/db.ts` as `CoachingProductKind`, which is the single source of truth.

### 🟢 Engagement and growth — live

| Table           | What it holds                                         |
| --------------- | ----------------------------------------------------- |
| `jds`           | Candidate-pasted job descriptions for the ATS checker |
| `notifications` | The in-app bell feed                                  |
| `leads`         | Pre-signup capture, incl. Career Positioning results  |
| `events`        | Webinars, workshops, AMAs, masterclasses              |

### 💤 Job board and employer — dormant

Schema kept, surfaces unlinked from candidate nav. **Don't build on them; don't delete
them.**

| Table              | Referenced in app code?                |
| ------------------ | -------------------------------------- |
| `jobs`             | Yes — admin + dormant candidate routes |
| `saved_jobs`       | Yes                                    |
| `applications`     | Yes                                    |
| `employers`        | Yes                                    |
| `client_companies` | Yes                                    |
| `placements`       | Yes                                    |
| `commissions`      | Yes                                    |
| `job_scores`       | **No** — zero references               |
| `matches`          | **No** — zero references               |
| `referrals`        | **No** — zero references               |

The last three have schema and nothing else. They're the tail of the matching feature
that was specified but never built (`docs/deferred/ec-matching-*.md`).

---

## Enums

Import these from `src/types/db.ts`, never from `database.types.ts`.

### Live

| Enum                      | Values                                                                        |
| ------------------------- | ----------------------------------------------------------------------------- |
| `user_role`               | `candidate` · `admin` · `employer`                                            |
| `resume_status`           | `uploading` · `processing` · `complete` · `failed`                            |
| `linkedin_sync_status`    | `idle` · `processing` · `complete` · `failed`                                 |
| `enrollment_status`       | `active` · `completed` · `expired` · `refunded`                               |
| `coaching_session_status` | See `db.ts` / generated types                                                 |
| `payment_status`          | `succeeded` · `pending` · `failed`                                            |
| `product_type`            | See `db.ts` / generated types                                                 |
| `event_type`              | `webinar` · `workshop` · `ama` · `masterclass`                                |
| `switch_urgency`          | `actively_looking` · `open` · `passive` · `not_looking`                       |
| `work_auth`               | See `db.ts` / generated types                                                 |
| `remote_preference`       | `remote` · `hybrid` · `onsite` · `flexible`                                   |
| `billing_cadence`         | `one_time` · `monthly` · `quarterly` · `annual` — **only `one_time` is live** |

The two async-job status enums follow the shared background-job pattern described in
[`architecture.md`](architecture.md#the-async-background-job-pattern). New async
features should use the same four values.

### Dormant

`plan` (`free`/`plan_1`/`plan_2`/`plan_3`) · `job_tier` · `job_status` ·
`application_status` · `remote_policy` · `subscription_status` · `commission_status` ·
`referral_status` · `relationship_type` · `placement_status`

`plan` and `subscription_status` are the subscription model. **Frozen, not extended.**

---

## Database functions

| Function                | Used for                                          |
| ----------------------- | ------------------------------------------------- |
| `is_admin()`            | RLS predicate                                     |
| `is_employer()`         | RLS predicate                                     |
| `current_employer_id()` | RLS predicate — scopes employer rows              |
| `can_see_job_tier()`    | 💤 Dormant. Plan-based job visibility. **Frozen** |
| `is_paid_subscriber()`  | 💤 Dormant. Subscription check. **Frozen**        |

---

## Storage buckets

| Bucket             | Contents                       |
| ------------------ | ------------------------------ |
| `resumes`          | Uploaded PDF/DOC/DOCX resumes  |
| `linkedin-exports` | LinkedIn "Save to PDF" exports |

---

## Row Level Security

**RLS is the authorization model.** The publishable key is safe in the browser
precisely because policies decide what it can reach.

Rules that matter:

- **Every new table needs RLS policies in the same migration.** No exceptions.
- The **service client** (`src/lib/supabase/service.ts`) bypasses RLS entirely. It
  exists for Inngest workers and webhook handlers, which have no user session. Never
  reachable from the browser.
- The **server client** does _not_ bypass RLS. Don't assume it does.
- Candidates read and write only their own rows. Admins get broad access via
  `is_admin()`. Employers are scoped by `current_employer_id()`.
- A migration (`20260903000000_enrollments_no_self_grant.sql`) removes the candidate
  INSERT policy on `enrollments`, so entitlement can only be granted by server code
  that checked something first. Exactly two writers do, both on the service-role
  client: `handleCheckoutCompleted()` (a completed payment) and `redeemInviteCode()`
  (a valid `BETA_INVITE_CODE`). This is what makes the purchase gate trustworthy.

### The failure mode that will cost you an afternoon

**A policy-blocked write returns success-shaped empty data, not an error.** If a write
appears to succeed but no row exists, suspect RLS before anything else. This exact bug
shipped once: every admin coaching-product write was silently rejected until a
migration fixed the policy.

---

## Migrations

- Location: `supabase/migrations/`, filename `YYYYMMDDHHMMSS_description.sql`
- Apply: `npx supabase db push`
- **Never edit an applied migration.** Write a new one.
- After any change: `npm run supabase:types`, then add new enums/rows to
  `src/types/db.ts`.

Seed migrations that matter: `20260815000001_coaching_catalog_seed.sql` (the SKU
catalog), `20260903010000_beta_access_product.sql` (the comp "Beta Access" product —
`is_active = false`, so it stays out of `/pricing`, the catalog, and dashboard signals
while still satisfying the `NOT NULL` on `enrollments.product_id`), `20260602000000_blueprint_assessment_seed.sql`,
`20260814000000_big_wins_assessment_seed.sql`,
`20260819120000_role_clarity_assessment_seed.sql`.

---

## Requires sign-off before you touch it

- `profiles` — auth-linked
- `handle_new_user()` / `handle_auth_user_updated()` triggers
- RLS policies on `resumes`, `jobs`, `applications`, `payments`, `enrollments`
- Any migration that already ran on production
