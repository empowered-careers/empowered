# Empowered Careers — Admin & Operations

> Last updated: 2026-05-23
> Status: Phase 1 admin console shipped. Phase 2 recruiters portal shipped.
> Authoritative build plans: `docs/done/ec-admin-super-plan.md` (Phase 1 — shipped 2026-05-20), `docs/done/ec-admin-recruiters-plan.md` (Phase 2 — shipped 2026-05-23)

This doc is the operations-side overview: what Lauren does day-to-day and how the build plans map onto it. For schema, routes, and RLS, defer to the two plans above.

---

## Lauren — Admin Journey (Phase 1, shipped)

Phase 1 replaced Lauren's Supabase Studio + Google Sheets workflow with the super admin console at `/admin/*`. Every surface below is live. See `docs/done/ec-admin-super-plan.md` for the route table and RLS.

### Job Management — `/admin/jobs`

- Create / edit / archive listings (title, company, level, description, requirements, tier)
- Assign tier manually (Tier 1 / Tier 2 / Tier 3); promote employer-submitted Tier 2 roles to Tier 3
- Mark role as filled

### Candidate Pool — `/admin/candidates` + `/admin/candidates/[id]`

- Filterable table: plan, completeness, role-clarity score, assessment count, signup date
- Per-candidate detail: resume, LinkedIn, assessments, match scores, applications, payments
- Add internal notes (`profiles.internal_notes`)

### Payments + Subscriptions — `/admin/payments`

- Stripe payment ledger across candidates
- Manual Plan-3 grant override (unlocks Tier 3 access)

### Applications + Placements — `/admin/applications`, `/admin/placements`

- Pipeline kanban across all candidates; status transitions append to `applications.status_log`
- Mark-as-placed flow creates a `placements` row; if the employer is `agency_partner`, also writes a `commissions` row at the configured rate
- Placement count drives the marketing page total

### Commissions + Employers + Coaching — `/admin/commissions`, `/admin/employers`, `/admin/coaching`

- Per-agency commission ledger: mark invoiced / paid / written-off
- Employer + agency CRUD (company, contact, `relationship_type`, `commission_rate`); invite-contact magic link sends a real Supabase invite that lands the employer at `/employer` and stamps `profiles.role='employer'` + `employer_id`
- `coaching_products` catalog CRUD + enrollment list

### Overview — `/admin`

Tiles: active candidates (free vs paid), open roles by tier, applications by status, placements MTD, commission outstanding.

---

## Recruiters Portal (Phase 2)

Phase 2 ships a single `/employer/*` portal that serves both **direct clients** and **agency partners**, distinguished by `employers.relationship_type`. Full plan: `docs/done/ec-admin-recruiters-plan.md`.

### Phase 1 (manual — Google Sheets)

- Agency / direct-client name, contact, commission rate tracked in Sheets
- Roles submitted via email or form; Lauren adds them in `/admin/jobs`
- Placements + commissions tracked in `/admin/placements` and `/admin/commissions`; Sheets is the source of truth for anything outside that

### Phase 2 (portal)

- Login + dashboard at `/employer`
- Submit + manage own roles (`/employer/jobs`) — auto-tagged `tier_2`; Lauren promotes to `tier_3`
- For agencies: CRUD their private `client_companies` list and tag each job with a client
- Applications view (`/employer/applications`) with **full candidate PII** — name, email, phone, LinkedIn, resume, ATS score, assessment summaries
- Status moves up to `offer`; `placed` stays admin-only (drives commissions/fees)
- Placements + commission visibility (read-only)

### PII decision (overrides this doc's earlier spec)

Phase 1 of this doc previously said "no PII until match confirmed." The recruiters plan overrides that: employer users see **full candidate PII the moment a candidate expresses interest**. The candidate-facing "Express interest" CTA must surface this so consent is informed — wired into the existing `expressInterest` action.

---

## CRM Tool Decisions

| Tool          | Use Case                             | When                                                                  |
| ------------- | ------------------------------------ | --------------------------------------------------------------------- |
| Google Sheets | Agency + employer pipeline tracking  | Now — until recruiters portal ships                                   |
| Pipedrive     | Agency + employer CRM                | After 10 agencies onboarded (same trigger as recruiters portal build) |
| Loops         | Candidate lifecycle email automation | Sprint 6                                                              |

---

## Loops — Candidate Email Events

Events piped from Supabase to Loops:

| Event                           | Trigger                            |
| ------------------------------- | ---------------------------------- |
| `candidate.signup`              | Account created                    |
| `candidate.resume_uploaded`     | Resume upload complete             |
| `candidate.payment`             | Any payment made                   |
| `candidate.assessment_complete` | Each assessment submitted          |
| `candidate.tier2_unlocked`      | Tier 2 access granted              |
| `candidate.tier3_unlocked`      | Subscription or payment confirmed  |
| `candidate.job_interest`        | Express interest clicked on a role |
| `candidate.inactive_7d`         | No login for 7 days                |
| `candidate.inactive_30d`        | No login for 30 days               |

---

## Placement Tracking

- Lauren marks a candidate as placed from `/admin/applications/[id]` → `placements` row created
- For `agency_partner` employers, a `commissions` row is created at the configured rate; reconciled via `/admin/commissions`
- Success story prompt sent to the candidate (via Loops)
- Placement count updates on the marketing page
