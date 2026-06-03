# Database Schema

Supabase (PostgreSQL). Types live in `src/types/database.types.ts`.

> Vocabulary: **Plan** = what the candidate buys (free / plan_1 / plan_2 / plan_3) +
> **billing cadence** (one_time / monthly / annual). **Job Tier** = exclusivity bucket
> a job belongs to (tier_1 = public, tier_2 = curated, tier_3 = closed network).
> Never say just "Tier 1/2/3" — always qualify as Plan or Job Tier.
>
> **Two distinct scores — do not conflate.**
> • **Resume Score** (`resumes.resume_score`, 0–100) — intrinsic resume quality
> computed by the LLM at upload time. Job-agnostic. Measures tenure, role
> progression, skill density, impact signals, formatting.
> • **ATS Score** (will live in `matches.match_score`, 0–100) — resume-vs-job
> fit for a _specific_ posting. Computed at match time (Sprint 4 / E4).
> Today's `matches` table is the placeholder; no code writes it yet.

---

## Tables

### `profiles`

Core user table, keyed by Supabase auth `id`.

| column                  | type                                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| id                      | uuid (PK, matches auth.users)                                          |
| email                   | text                                                                   |
| full_name               | text                                                                   |
| phone                   | text                                                                   |
| linkedin_url            | text                                                                   |
| linkedin_provider_id    | text                                                                   |
| google_provider_id      | text                                                                   |
| stripe_customer_id      | text                                                                   |
| plan                    | enum (`free` \| `plan_1` \| `plan_2` \| `plan_3`)                      |
| billing_cadence         | enum (`one_time` \| `monthly` \| `annual`) — null when `plan = 'free'` |
| subscription_status     | enum                                                                   |
| role                    | enum (`candidate` \| `admin` \| `employer`) — default `candidate`      |
| employer_id             | → employers — non-null when `role = 'employer'`                        |
| internal_notes          | text — admin-only free-text per-candidate notes                        |
| lead_id                 | → leads — set at OAuth callback when email matches a lead row          |
| acquisition_source      | text — mirrors `leads.source` at conversion (`linkedin` / `email` / …) |
| acquisition_ref         | text — mirrors `leads.source_ref` (campaign slug, post id, etc.)       |
| onboarding_completed_at | timestamptz                                                            |
| created_at / updated_at | timestamptz                                                            |

---

### `resumes`

One or more resumes per profile.

| column                         | type                                                         |
| ------------------------------ | ------------------------------------------------------------ |
| id                             | uuid (PK)                                                    |
| profile_id                     | → profiles                                                   |
| raw_file_url                   | text                                                         |
| file_name                      | text                                                         |
| file_hash                      | text — content hash for dedup + supersession detection       |
| is_current                     | boolean — only one row per profile is current at a time      |
| superseded_at                  | timestamptz — stamped when a newer resume supersedes this    |
| parsed_text                    | text                                                         |
| parsed_json                    | jsonb                                                        |
| resume_score                   | int — job-agnostic LLM Resume Score (0–100)                  |
| seniority_level                | text — derived by LLM parser                                 |
| total_years_exp                | numeric                                                      |
| parser_model / scorer_model    | text — Anthropic model id used                               |
| prompt_version                 | text — `RESUME_PROMPT_VERSION` at parse time                 |
| status                         | enum (`uploading` \| `processing` \| `complete` \| `failed`) |
| parse_started_at / parse_error | timestamptz / text                                           |
| uploaded_at / parsed_at        | timestamptz                                                  |

---

### `linkedin_profiles`

Synced LinkedIn data per profile.

| column                       | type                                                          |
| ---------------------------- | ------------------------------------------------------------- |
| id                           | uuid (PK)                                                     |
| profile_id                   | → profiles (unique)                                           |
| linkedin_url                 | text — OAuth-sourced; never touched by the PDF parser         |
| headline                     | text — OAuth-sourced; never touched by the PDF parser         |
| raw_json                     | jsonb — OAuth identity payload; never touched by the parser   |
| summary                      | text — derived by LLM from the uploaded PDF                   |
| parsed_json                  | jsonb — full parsed structure from the PDF                    |
| profile_score                | int                                                           |
| file_hash                    | text — content hash for dedup on PDF uploads                  |
| last_export_path             | text — storage path of the last LinkedIn "Save to PDF" upload |
| parser_model / scorer_model  | text — Anthropic model id used                                |
| prompt_version               | text — `LINKEDIN_PROMPT_VERSION` at parse time                |
| status                       | enum (`idle` \| `processing` \| `complete` \| `failed`)       |
| sync_started_at / sync_error | timestamptz / text                                            |
| synced_at                    | timestamptz                                                   |

---

### `assessments`

Assessment definitions (question banks).

| column         | type        |
| -------------- | ----------- |
| id             | uuid (PK)   |
| name           | text        |
| description    | text        |
| question_count | int         |
| created_at     | timestamptz |

---

### `assessment_responses`

Candidate responses to an assessment.

| column        | type                                                         |
| ------------- | ------------------------------------------------------------ |
| id            | uuid (PK)                                                    |
| profile_id    | → profiles                                                   |
| assessment_id | → assessments                                                |
| responses     | jsonb                                                        |
| score         | int                                                          |
| archetype     | text — denormalized archetype name for display / admin lists |
| result        | jsonb — full computed Blueprint display blob                 |
| completed_at  | timestamptz                                                  |

---

### `candidate_scores`

Computed dimension scores per candidate. One row per profile.

Phase 1 uses 5 dimensions: `role_clarity_score`, `values_score`, `strengths_score`,
`leadership_score`, `impact_score`. `mindset_score` and `communication_score` are
retained for Phase 2 expanded assessments (see Sprint P2-5 in `ec-dev-plan.md`)
and should be left null by Phase 1 code. `culture_axes` stores normalized 0–100
preference and trait axes from the Career Identity Blueprint (written on Blueprint
completion; read by matching and future company-fit queries).

| column              | type                                                          | phase |
| ------------------- | ------------------------------------------------------------- | ----- |
| id                  | uuid (PK)                                                     | —     |
| profile_id          | → profiles (unique)                                           | —     |
| role_clarity_score  | int                                                           | P1    |
| values_score        | int                                                           | P1    |
| strengths_score     | int                                                           | P1    |
| leadership_score    | int                                                           | P1    |
| impact_score        | int                                                           | P1    |
| overall_score       | int                                                           | P1    |
| mindset_score       | int                                                           | P2    |
| communication_score | int                                                           | P2    |
| culture_axes        | jsonb — Blueprint axes (0–100), keyed by canonical axis names | —     |
| updated_at          | timestamptz                                                   | —     |

---

### `candidate_preferences`

Job-seeking preferences captured at onboarding (Tier A — required, soft gate)
and at first Express Interest (Tier B — comp + location). The remaining
fields are optional, editable from `/profile`. One row per profile.

| column                                                | type                              |
| ----------------------------------------------------- | --------------------------------- |
| id                                                    | uuid (PK)                         |
| profile_id                                            | → profiles (unique)               |
| target_role                                           | text                              |
| target_seniority                                      | text — mirrors resume seniority   |
| industries                                            | text[]                            |
| switch_urgency                                        | enum `switch_urgency`             |
| notice_period_days                                    | int                               |
| work_authorization                                    | enum `work_auth`                  |
| expected_salary_min_cents / expected_salary_max_cents | int                               |
| expected_salary_currency                              | text — default `'USD'`            |
| current_location                                      | text                              |
| remote_preference                                     | enum `remote_preference`          |
| current_salary_cents                                  | int                               |
| current_salary_currency                               | text — default `'USD'`            |
| willing_to_relocate                                   | boolean                           |
| target_companies                                      | text[] — free text, keyed later   |
| blocklist_companies                                   | text[] — never shown to employers |
| preferred_domains                                     | text[]                            |
| created_at / updated_at                               | timestamptz                       |

RLS: `candidate_preferences_self` (self read/insert/update keyed on
`profile_id = auth.uid()`); `candidate_preferences_admin` overlay via
`is_admin()` so Lauren can read + update everything from the admin console.

Stamping `profiles.onboarding_completed_at` is what releases the soft gate;
the gate is checked in `/dashboard` (banner) and `/job-board` (redirect).

---

### `employers`

Employer/partner accounts.

| column            | type                                       |
| ----------------- | ------------------------------------------ |
| id                | uuid (PK)                                  |
| company_name      | text                                       |
| contact_name      | text                                       |
| contact_email     | text                                       |
| relationship_type | enum (`direct_client` \| `agency_partner`) |
| commission_rate   | numeric(5,2) — percent, e.g. `20.00`       |
| notes             | text                                       |
| created_at        | timestamptz                                |

---

### `jobs`

Job postings submitted by employers.

| column                  | type                                                         |
| ----------------------- | ------------------------------------------------------------ |
| id                      | uuid (PK)                                                    |
| submitted_by            | → employers                                                  |
| title                   | text                                                         |
| company_name            | text                                                         |
| description             | text                                                         |
| location                | text                                                         |
| remote_policy           | enum                                                         |
| salary_min / salary_max | int                                                          |
| requirements            | jsonb                                                        |
| job_tier                | enum (`tier_1` \| `tier_2` \| `tier_3`) — exclusivity bucket |
| status                  | enum (`active` \| `filled` \| `expired`)                     |
| client_company_id       | → client_companies (nullable; agency-posted roles only)      |
| posted_at / expires_at  | timestamptz                                                  |

Employer-side RLS (in `20260523000001_employer_rls.sql`): an employer can
read all rows (already permitted to authenticated) and write only their own
(`submitted_by = current_employer_id()`). Employer-posted roles always
default to `tier_2`; Lauren promotes to higher tiers from `/admin/jobs`.

---

### `client_companies`

Agency-private label table. Each agency keeps its own list of end-client
companies it posts roles for. Same company name across two different
agencies = two unrelated rows. **Not** a copy of `employers` —
direct-client employers post for themselves and ignore this table.

| column             | type                           |
| ------------------ | ------------------------------ |
| id                 | uuid (PK)                      |
| agency_employer_id | → employers (the agency owner) |
| name               | text                           |
| contact_name       | text                           |
| contact_email      | text                           |
| created_at         | timestamptz                    |
| updated_at         | timestamptz                    |

`UNIQUE (agency_employer_id, name)`. RLS (in
`20260523000000_client_companies.sql`): an agency only sees its own rows;
admins see all.

---

### `job_scores`

Score weighting config per job. One row per job. Same dimension columns as
`candidate_scores` — `mindset_weight` and `communication_weight` are Phase 2
holdovers.

| column               | type            |
| -------------------- | --------------- |
| id                   | uuid (PK)       |
| job_id               | → jobs (unique) |
| role_clarity_weight  | int             |
| values_weight        | int             |
| strengths_weight     | int             |
| leadership_weight    | int             |
| impact_weight        | int             |
| mindset_weight       | int (P2)        |
| communication_weight | int (P2)        |
| updated_at           | timestamptz     |

---

### `matches`

Candidate ↔ job match results. `match_score` is the **ATS Score** going
forward — resume-vs-job fit for a specific posting. Sprint 4 (E4) ships the
first writer; today the table exists but no code reads or writes it.

| column               | type                                   |
| -------------------- | -------------------------------------- |
| id                   | uuid (PK)                              |
| profile_id           | → profiles                             |
| job_id               | → jobs                                 |
| match_score          | int — ATS Score (resume-vs-job, 0–100) |
| match_reasons        | jsonb                                  |
| candidate_interested | boolean                                |
| employer_interested  | boolean                                |
| created_at           | timestamptz                            |

---

### `applications`

Express-interest → placed pipeline. Created when a candidate clicks
"Express interest" on a job.

| column                  | type                                        |
| ----------------------- | ------------------------------------------- |
| id                      | uuid (PK)                                   |
| profile_id              | → profiles                                  |
| job_id                  | → jobs                                      |
| status                  | enum (see below)                            |
| status_log              | jsonb (audit trail of `{ status, at, by }`) |
| internal_notes          | text (Lauren-only)                          |
| created_at / updated_at | timestamptz                                 |

`UNIQUE (profile_id, job_id)`.

Candidate-facing RLS (added in `20260520030000_applications_candidate_rls.sql`):
read own rows, insert own rows only at `status='interested'`, self-update
only to `status='withdrawn'`. Admin blanket policy `applications_admin_all`
(in `20260520040000_admin_rls.sql`) stacks on top. Employer policies
(`20260523000001_employer_rls.sql`) layer additively: an employer can read

- update applications on their own jobs, with status restricted to
  `screening | interviewing | offer | rejected` (placed stays admin-only —
  drives commissions + fees).
  Table is in the `supabase_realtime` publication with `REPLICA IDENTITY FULL`
  so the candidate notification hook sees prev/next row diffs.

---

### `saved_jobs`

Candidate bookmarks on the job board (separate from `applications` — bookmarking
does not share PII with the employer).

| column     | type        |
| ---------- | ----------- |
| profile_id | → profiles  |
| job_id     | → jobs      |
| created_at | timestamptz |

`PRIMARY KEY (profile_id, job_id)`. RLS: self-only read/insert/delete.

---

### `events`

Public-facing marketing events (webinars / workshops / AMAs / masterclasses).
Drives `/events` listing + `/events/[slug]` registration. See
`docs/done/ec-events-growth-plan.md`.

| column                  | type                                                     |
| ----------------------- | -------------------------------------------------------- |
| id                      | uuid (PK)                                                |
| slug                    | text (unique) — channel-tagged URL slug                  |
| title                   | text                                                     |
| subtitle                | text                                                     |
| description             | text                                                     |
| event_type              | enum (`webinar` \| `workshop` \| `ama` \| `masterclass`) |
| host_name               | text — default `'Lauren Laughlin'`                       |
| scheduled_at            | timestamptz                                              |
| duration_min            | int — default 60                                         |
| max_seats               | int — null = unlimited                                   |
| cover_image_url         | text                                                     |
| replay_url              | text — set post-event                                    |
| is_published            | boolean — draft/live toggle                              |
| is_past                 | boolean — flipped by Lauren or auto after `scheduled_at` |
| created_at / updated_at | timestamptz                                              |

RLS: `events_read_public` (select for anon + authenticated when
`is_published = true`); `events_admin_all` (all ops gated on `is_admin()`).

---

### `leads`

Pre-platform registrants captured from `/events/[slug]` (and other future
acquisition surfaces). Bridges anonymous event registration → authenticated
platform signup via email match in the OAuth callback.

| column                  | type                                                                             |
| ----------------------- | -------------------------------------------------------------------------------- |
| id                      | uuid (PK)                                                                        |
| email                   | text                                                                             |
| full_name               | text                                                                             |
| source                  | text — `linkedin` \| `email` \| `instagram` \| `direct` \| `referral` \| `other` |
| source_ref              | text — campaign slug / post id / etc.                                            |
| event_id                | → events — null if the lead wasn't tied to an event                              |
| registered_at           | timestamptz                                                                      |
| attended_at             | timestamptz — set by bulk-attend CSV upload or future Zoom webhook               |
| converted_profile_id    | → profiles — stamped at OAuth callback when email matches                        |
| converted_at            | timestamptz                                                                      |
| created_at / updated_at | timestamptz                                                                      |

`UNIQUE (email, event_id)` — one registration per email per event. Service-role
writes from `/api/events/register` bypass RLS. Read policies:
`leads_admin_read` + `leads_admin_update` (gated on `is_admin()`). No
candidate-self read — candidates don't need their own lead row visible.

---

### `placements`

Confirmed hires. Drives marketing placement-count + commission tracking.

| column                  | type                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------- |
| id                      | uuid (PK)                                                                          |
| application_id          | → applications (unique)                                                            |
| profile_id              | → profiles                                                                         |
| job_id                  | → jobs                                                                             |
| employer_id             | → employers                                                                        |
| placed_at               | timestamptz                                                                        |
| start_date              | date                                                                               |
| salary                  | int                                                                                |
| fee_amount              | int (cents)                                                                        |
| status                  | enum (`pending` \| `confirmed` \| `guarantee_period` \| `finalized` \| `refunded`) |
| notes                   | text                                                                               |
| created_at / updated_at | timestamptz                                                                        |

---

### `referrals`

Candidate-invites-candidate. Attribution carries through to placements.

| column                  | type                                                |
| ----------------------- | --------------------------------------------------- |
| id                      | uuid (PK)                                           |
| referrer_id             | → profiles                                          |
| referred_email          | text                                                |
| referred_profile_id     | → profiles (set when they sign up)                  |
| placement_id            | → placements (set when the referred user is placed) |
| status                  | enum (`invited` \| `signed_up` \| `placed`)         |
| created_at / updated_at | timestamptz                                         |

`UNIQUE (referrer_id, referred_email)`.

---

### `coaching_products`

Catalog of coaching modules / session packs / 1:1 offerings.

| column                  | type                                              |
| ----------------------- | ------------------------------------------------- |
| id                      | uuid (PK)                                         |
| name                    | text                                              |
| description             | text                                              |
| type                    | enum (`module` \| `session_pack` \| `one_to_one`) |
| external_url            | text (Kajabi/Teachable link, etc.)                |
| stripe_price_id         | text                                              |
| price_cents             | int                                               |
| is_active               | boolean                                           |
| created_at / updated_at | timestamptz                                       |

---

### `enrollments`

Candidate ↔ coaching product. Granted by purchase or Plan 3 activation.

| column                    | type                                                      |
| ------------------------- | --------------------------------------------------------- |
| id                        | uuid (PK)                                                 |
| profile_id                | → profiles                                                |
| product_id                | → coaching_products                                       |
| payment_id                | → payments                                                |
| status                    | enum (`active` \| `completed` \| `expired` \| `refunded`) |
| progress                  | int (0–100, updated by external webhook)                  |
| granted_at / completed_at | timestamptz                                               |
| updated_at                | timestamptz                                               |

---

### `coaching_sessions`

1:1 booking records. Cal.com webhook is the writer.

| column                  | type                                                         |
| ----------------------- | ------------------------------------------------------------ |
| id                      | uuid (PK)                                                    |
| enrollment_id           | → enrollments                                                |
| profile_id              | → profiles                                                   |
| scheduled_for           | timestamptz                                                  |
| duration_min            | int                                                          |
| cal_event_id            | text                                                         |
| status                  | enum (`scheduled` \| `completed` \| `no_show` \| `canceled`) |
| notes                   | text                                                         |
| created_at / updated_at | timestamptz                                                  |

---

### `commissions`

Per-placement commission owed to an agency partner. Admin-only.

| column                  | type                                                      |
| ----------------------- | --------------------------------------------------------- |
| id                      | uuid (PK)                                                 |
| placement_id            | → placements                                              |
| employer_id             | → employers                                               |
| amount_cents            | int                                                       |
| rate                    | numeric(5,2)                                              |
| status                  | enum (`pending` \| `invoiced` \| `paid` \| `written_off`) |
| invoiced_at / paid_at   | timestamptz                                               |
| notes                   | text                                                      |
| created_at / updated_at | timestamptz                                               |

---

### `payments`

Stripe payment records.

| column                   | type                                        |
| ------------------------ | ------------------------------------------- |
| id                       | uuid (PK)                                   |
| profile_id               | → profiles                                  |
| stripe_payment_intent_id | text                                        |
| amount                   | int (cents)                                 |
| product_type             | enum                                        |
| status                   | enum (`succeeded` \| `pending` \| `failed`) |
| created_at               | timestamptz                                 |

---

## Enums

| enum                      | values                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `plan`                    | `free`, `plan_1`, `plan_2`, `plan_3`                                                               |
| `user_role`               | `candidate`, `admin`, `employer`                                                                   |
| `billing_cadence`         | `one_time`, `monthly`, `annual`                                                                    |
| `subscription_status`     | `active`, `canceled`, `expired`, `trial`                                                           |
| `job_status`              | `active`, `filled`, `expired`                                                                      |
| `job_tier`                | `tier_1`, `tier_2`, `tier_3`                                                                       |
| `remote_policy`           | `remote`, `hybrid`, `onsite`                                                                       |
| `relationship_type`       | `direct_client`, `agency_partner`                                                                  |
| `event_type`              | `webinar`, `workshop`, `ama`, `masterclass`                                                        |
| `switch_urgency`          | `actively_looking`, `open`, `passive`, `not_looking`                                               |
| `work_auth`               | `us_citizen`, `us_permanent_resident`, `us_visa_needed`, `eu_citizen`, `other`                     |
| `remote_preference`       | `remote`, `hybrid`, `onsite`, `flexible`                                                           |
| `product_type`            | `webinar`, `resume_review`, `linkedin_review`, `interview_prep`, `subscription`                    |
| `payment_status`          | `succeeded`, `pending`, `failed`                                                                   |
| `resume_status`           | `uploading`, `processing`, `complete`, `failed`                                                    |
| `linkedin_sync_status`    | `idle`, `processing`, `complete`, `failed`                                                         |
| `application_status`      | `interested`, `submitted`, `screening`, `interviewing`, `offer`, `placed`, `rejected`, `withdrawn` |
| `placement_status`        | `pending`, `confirmed`, `guarantee_period`, `finalized`, `refunded`                                |
| `referral_status`         | `invited`, `signed_up`, `placed`                                                                   |
| `coaching_product_type`   | `module`, `session_pack`, `one_to_one`                                                             |
| `enrollment_status`       | `active`, `completed`, `expired`, `refunded`                                                       |
| `coaching_session_status` | `scheduled`, `completed`, `no_show`, `canceled`                                                    |
| `commission_status`       | `pending`, `invoiced`, `paid`, `written_off`                                                       |

---

## Functions

| function                     | returns                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `is_paid_subscriber()`       | boolean — `true` when current user's `plan <> 'free'` and `subscription_status = 'active'`                       |
| `is_admin()`                 | boolean — `true` when current user's `profiles.role = 'admin'` (SECURITY DEFINER)                                |
| `is_employer()`              | boolean — `true` when current user's `profiles.role = 'employer'` (SECURITY DEFINER)                             |
| `current_employer_id()`      | uuid — current user's `profiles.employer_id` (SECURITY DEFINER; null for non-employer roles)                     |
| `can_see_job_tier(p, t)`     | boolean — Tier 1 always; Tier 2 for `plan_1/2/3`; Tier 3 for `plan_3`. Mirrored client-side in `src/lib/plan.ts` |
| `handle_new_user()`          | trigger — populates `profiles` on `auth.users` INSERT                                                            |
| `handle_auth_user_updated()` | trigger — syncs email / providers on `auth.users` UPDATE                                                         |
