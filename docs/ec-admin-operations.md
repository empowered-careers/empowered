# Empowered Careers — Admin & Operations

> Last updated: May 2026
> Status: Working document

---

## Lauren — Admin Journey (Phase 1)

Lauren operates the platform manually in Phase 1. No agency portal, no automation — just a clean admin interface she can use without calling the dev.

### Job Management
- Add new job listing (title, company, level, description, requirements, tier)
- Edit existing listing
- Remove or archive listing
- Assign tier manually (Tier 1 / Tier 2 / Tier 3)
- Mark role as filled

### Candidate Pool
- View all candidates with profile completeness score
- Filter by: score, role type, seniority level, assessment completion
- View individual candidate profile (resume, assessments, match scores)
- Manually flag a candidate for a specific role
- Add internal notes on a candidate

### Payments + Subscriptions
- View active subscriptions
- View à la carte purchases
- Manual override — grant Tier 3 access to a candidate if needed

### Performance View
- Active candidates (free vs paid)
- Nudge performance (which CTAs are converting)
- Role views + expressions of interest per listing

---

## Agency Journey (Phase 2)

Phase 1: Lauren manages agency relationships manually via Google Sheets.
Phase 2: Agency portal built once 10+ agencies are onboarded.

### Phase 1 (Manual — Google Sheets)
- Agency name, contact, commission rate tracked in Sheets
- Roles submitted via email or form, Lauren adds manually
- Placement tracked manually
- Commission calculated manually

### Phase 2 (Portal)
- Agency login + dashboard
- Submit role (title, company, level, description, requirements)
- Track role status (active, filled, archived)
- View candidates who expressed interest (no PII until match confirmed)
- Commission tracking + payout history

---

## CRM Tool Decisions

| Tool | Use Case | When |
|---|---|---|
| Google Sheets | Agency + employer pipeline tracking | Phase 1 (now) |
| Pipedrive | Agency + employer CRM | After 10 agencies onboarded |
| Loops | Candidate lifecycle email automation | Sprint 6 |

---

## Loops — Candidate Email Events

Events piped from Supabase to Loops:

| Event | Trigger |
|---|---|
| `candidate.signup` | Account created |
| `candidate.resume_uploaded` | Resume upload complete |
| `candidate.payment` | Any payment made |
| `candidate.assessment_complete` | Each assessment submitted |
| `candidate.tier2_unlocked` | Tier 2 access granted |
| `candidate.tier3_unlocked` | Subscription or payment confirmed |
| `candidate.job_interest` | Express interest clicked on a role |
| `candidate.inactive_7d` | No login for 7 days |
| `candidate.inactive_30d` | No login for 30 days |

---

## Placement Tracking (Phase 1 — Manual)

- Lauren marks a candidate as placed in admin
- Success story prompt sent to candidate (via Loops)
- Placement count updates on marketing page
- Commission tracked in Google Sheets if agency-sourced role
