# Database Schema

Supabase (PostgreSQL). Types live in `src/types/database.types.ts`.

---

## Tables

### `profiles`
Core user table, keyed by Supabase auth `id`.

| column | type |
|---|---|
| id | uuid (PK, matches auth.users) |
| email | text |
| full_name | text |
| phone | text |
| linkedin_url | text |
| linkedin_provider_id | text |
| google_provider_id | text |
| stripe_customer_id | text |
| subscription_tier | enum |
| subscription_status | enum |
| onboarding_completed_at | timestamptz |
| created_at / updated_at | timestamptz |

---

### `resumes`
One or more resumes per profile.

| column | type |
|---|---|
| id | uuid (PK) |
| profile_id | → profiles |
| raw_file_url | text |
| parsed_text | text |
| parsed_json | jsonb |
| ats_score | numeric |
| uploaded_at / parsed_at | timestamptz |

---

### `linkedin_profiles`
Synced LinkedIn data per profile.

| column | type |
|---|---|
| id | uuid (PK) |
| profile_id | → profiles |
| linkedin_url | text |
| headline | text |
| summary | text |
| profile_score | numeric |
| raw_json | jsonb |
| synced_at | timestamptz |

---

### `assessments`
Assessment definitions (question banks).

| column | type |
|---|---|
| id | uuid (PK) |
| name | text |
| description | text |
| question_count | int |
| created_at | timestamptz |

---

### `assessment_responses`
Candidate responses to an assessment.

| column | type |
|---|---|
| id | uuid (PK) |
| profile_id | → profiles |
| assessment_id | → assessments |
| responses | jsonb |
| score | numeric |
| completed_at | timestamptz |

---

### `candidate_scores`
Computed dimension scores per candidate. One row per profile.

| column | type |
|---|---|
| id | uuid (PK) |
| profile_id | → profiles (unique) |
| communication_score | numeric |
| leadership_score | numeric |
| mindset_score | numeric |
| values_score | numeric |
| strengths_score | numeric |
| impact_score | numeric |
| overall_score | numeric |
| updated_at | timestamptz |

---

### `employers`
Employer/partner accounts.

| column | type |
|---|---|
| id | uuid (PK) |
| company_name | text |
| contact_name | text |
| contact_email | text |
| relationship_type | enum (`direct_client` \| `agency_partner`) |
| notes | text |
| created_at | timestamptz |

---

### `jobs`
Job postings submitted by employers.

| column | type |
|---|---|
| id | uuid (PK) |
| submitted_by | → employers |
| title | text |
| company_name | text |
| description | text |
| location | text |
| remote_policy | enum |
| salary_min / salary_max | numeric |
| requirements | jsonb |
| status | enum (`active` \| `filled` \| `expired`) |
| posted_at / expires_at | timestamptz |

---

### `job_scores`
Score weighting config per job. One row per job.

| column | type |
|---|---|
| id | uuid (PK) |
| job_id | → jobs (unique) |
| communication_weight | numeric |
| leadership_weight | numeric |
| mindset_weight | numeric |
| values_weight | numeric |
| strengths_weight | numeric |
| impact_weight | numeric |
| updated_at | timestamptz |

---

### `matches`
Candidate ↔ job match results.

| column | type |
|---|---|
| id | uuid (PK) |
| profile_id | → profiles |
| job_id | → jobs |
| match_score | numeric |
| match_reasons | jsonb |
| candidate_interested | boolean |
| employer_interested | boolean |
| created_at | timestamptz |

---

### `payments`
Stripe payment records.

| column | type |
|---|---|
| id | uuid (PK) |
| profile_id | → profiles |
| stripe_payment_intent_id | text |
| amount | numeric |
| product_type | enum |
| status | enum (`succeeded` \| `pending` \| `failed`) |
| created_at | timestamptz |

---


## Enums

| enum | values |
|---|---|
| `subscription_tier` | `free`, `paid_monthly`, `paid_annual` |
| `subscription_status` | `active`, `canceled`, `expired`, `trial` |
| `job_status` | `active`, `filled`, `expired` |
| `remote_policy` | `remote`, `hybrid`, `onsite` |
| `relationship_type` | `direct_client`, `agency_partner` |
| `product_type` | `webinar`, `resume_review`, `linkedin_review`, `interview_prep`, `subscription` |
| `payment_status` | `succeeded`, `pending`, `failed` |

---

## Functions

| function | returns |
|---|---|
| `is_paid_subscriber()` | boolean |
