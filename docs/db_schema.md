# Database Schema

Supabase (PostgreSQL). Types live in `src/types/database.types.ts`.

> Vocabulary: **Plan** = what the candidate buys (free / plan_1 / plan_2 / plan_3) +
> **billing cadence** (one_time / monthly / annual). **Job Tier** = exclusivity bucket
> a job belongs to (tier_1 = public, tier_2 = curated, tier_3 = closed network).
> Never say just "Tier 1/2/3" — always qualify as Plan or Job Tier.

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
| parsed_text                    | text                                                         |
| parsed_json                    | jsonb                                                        |
| ats_score                      | int                                                          |
| status                         | enum (`uploading` \| `processing` \| `complete` \| `failed`) |
| parse_started_at / parse_error | timestamptz / text                                           |
| uploaded_at / parsed_at        | timestamptz                                                  |

---

### `linkedin_profiles`

Synced LinkedIn data per profile.

| column                       | type                                                    |
| ---------------------------- | ------------------------------------------------------- |
| id                           | uuid (PK)                                               |
| profile_id                   | → profiles                                              |
| linkedin_url                 | text                                                    |
| headline                     | text                                                    |
| summary                      | text                                                    |
| profile_score                | int                                                     |
| raw_json                     | jsonb                                                   |
| status                       | enum (`idle` \| `processing` \| `complete` \| `failed`) |
| sync_started_at / sync_error | timestamptz / text                                      |
| synced_at                    | timestamptz                                             |

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

| column        | type          |
| ------------- | ------------- |
| id            | uuid (PK)     |
| profile_id    | → profiles    |
| assessment_id | → assessments |
| responses     | jsonb         |
| score         | int           |
| completed_at  | timestamptz   |

---

### `candidate_scores`

Computed dimension scores per candidate. One row per profile.

Phase 1 uses 5 dimensions: `role_clarity_score`, `values_score`, `strengths_score`,
`leadership_score`, `impact_score`. `mindset_score` and `communication_score` are
retained for Phase 2 expanded assessments (see Sprint P2-5 in `ec-dev-plan.md`)
and should be left null by Phase 1 code.

| column              | type                | phase |
| ------------------- | ------------------- | ----- |
| id                  | uuid (PK)           | —     |
| profile_id          | → profiles (unique) | —     |
| role_clarity_score  | int                 | P1    |
| values_score        | int                 | P1    |
| strengths_score     | int                 | P1    |
| leadership_score    | int                 | P1    |
| impact_score        | int                 | P1    |
| overall_score       | int                 | P1    |
| mindset_score       | int                 | P2    |
| communication_score | int                 | P2    |
| updated_at          | timestamptz         | —     |

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
| posted_at / expires_at  | timestamptz                                                  |

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

Candidate ↔ job match results.

| column               | type        |
| -------------------- | ----------- |
| id                   | uuid (PK)   |
| profile_id           | → profiles  |
| job_id               | → jobs      |
| match_score          | int         |
| match_reasons        | jsonb       |
| candidate_interested | boolean     |
| employer_interested  | boolean     |
| created_at           | timestamptz |

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
| `billing_cadence`         | `one_time`, `monthly`, `annual`                                                                    |
| `subscription_status`     | `active`, `canceled`, `expired`, `trial`                                                           |
| `job_status`              | `active`, `filled`, `expired`                                                                      |
| `job_tier`                | `tier_1`, `tier_2`, `tier_3`                                                                       |
| `remote_policy`           | `remote`, `hybrid`, `onsite`                                                                       |
| `relationship_type`       | `direct_client`, `agency_partner`                                                                  |
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

| function                     | returns                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `is_paid_subscriber()`       | boolean — `true` when current user's `plan <> 'free'` and `subscription_status = 'active'` |
| `handle_new_user()`          | trigger — populates `profiles` on `auth.users` INSERT                                      |
| `handle_auth_user_updated()` | trigger — syncs email / providers on `auth.users` UPDATE                                   |
