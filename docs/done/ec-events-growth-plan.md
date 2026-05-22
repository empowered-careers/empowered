# Empowered Careers — Events & Webinar Growth Loop

> Created: May 2026
> Scope: Public events surface + lead capture + platform conversion pipeline
> Related:
>
> - `docs/done/ec-admin-super-plan.md` — provides the role enum, `is_admin()` helper, and admin layout/sidebar shell that this plan's admin section slots into.
> - `docs/ec-dev-plan.md` §S8 — owns the broader Loops account + domain configuration; this plan ships `lead.*` events as an early slice (see "Loops prerequisite" below).
> - `docs/done/ec-candidate-pipeline-plan.md` — express-interest CTA also triggers candidate-facing PII consent + welcome copy; coordinate so an event-sourced candidate (via `lead.converted`) doesn't receive two competing onboarding flows on day 1.

---

## Overview

The events system is a **public-facing acquisition layer** — separate from the post-login candidate experience. It lives on the marketing site, not behind auth. Its job is to convert cold traffic (from LinkedIn, email, Instagram, and other channels) into warm leads, and warm leads into platform signups.

The core insight: **webinar registration ≠ platform signup.** These are two distinct moments with different friction levels and different intent signals. The system tracks both, bridges them, and attributes every platform signup back to its original channel and event.

---

## Architecture Overview

```
LinkedIn post / Email / Instagram / Direct
        ↓ (channel-tagged link)
/events  — public events listing page
        ↓
/events/[slug]  — individual event landing page
        ↓
Registration form (email + name, no OAuth required)
        ↓
leads table (email, source, channel, event_slug, registered_at)
        ↓
Loops: "registered" sequence fires
        ↓
Webinar runs (Zoom / StreamYard / whatever Lauren uses)
        ↓
Loops: "attended" sequence fires (post-event)
        ↓
CTA in email + on thank-you page: "Claim your free ATS score →"
        ↓
Platform signup (OAuth) — email matched to leads row
        ↓
leads.converted_profile_id set, converted_at stamped
        ↓
Loops: "converted" sequence fires (welcome, webinar-aware)
```

No dependency on any webinar tool's API. EC owns the registration step.

---

## Database Schema

### New table: `events`

```sql
create table events (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,           -- e.g. "resume-masterclass-june"
  title        text not null,
  subtitle     text,
  description  text,
  event_type   text not null,                  -- 'webinar' | 'workshop' | 'ama' | 'masterclass'
  host_name    text default 'Lauren Laughlin',
  scheduled_at timestamptz not null,
  duration_min int default 60,
  replay_url   text,                           -- set after event runs
  cover_image_url text,
  is_published boolean default false,
  is_past      boolean default false,          -- flipped by Lauren post-event
  max_seats    int,                            -- null = unlimited
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
```

RLS (uses `is_admin()` helper from `ec-admin-super-plan.md` — that migration lands first):

```sql
alter table events enable row level security;
create policy events_read_public on events for select to anon, authenticated
  using (is_published = true);
create policy events_admin_all on events for all to authenticated
  using (is_admin()) with check (is_admin());
```

---

### New table: `leads`

```sql
create table leads (
  id                   uuid primary key default gen_random_uuid(),
  email                text not null,
  full_name            text,

  -- acquisition
  source               text not null,          -- 'linkedin' | 'email' | 'instagram' | 'direct' | 'referral' | 'other'
  source_ref           text,                   -- campaign slug, post ID, etc.
  event_id             uuid references events(id),

  -- funnel state
  registered_at        timestamptz default now(),
  attended_at          timestamptz,            -- set by Lauren manually or via webhook

  -- conversion
  converted_profile_id uuid references profiles(id),
  converted_at         timestamptz,

  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),

  unique(email, event_id)                      -- one registration per email per event
);

create index on leads(email);
create index on leads(event_id);
create index on leads(converted_profile_id);
```

RLS (uses `is_admin()` helper from `ec-admin-super-plan.md`):

```sql
alter table leads enable row level security;
-- service-role writes from the /api/events/register route bypass RLS
create policy leads_admin_read on leads for select to authenticated
  using (is_admin());
create policy leads_admin_update on leads for update to authenticated
  using (is_admin()) with check (is_admin());
-- no public read; no candidate-self read (candidates don't need their own lead row visible)
```

---

### Addition to `profiles`

```sql
alter table profiles add column lead_id uuid references leads(id);
alter table profiles add column acquisition_source text;   -- mirrors leads.source at conversion time
alter table profiles add column acquisition_ref   text;    -- mirrors leads.source_ref
```

Populated at OAuth callback when a `leads` row is matched by email.

> **Sequencing note**: `profiles` is also being extended by `ec-admin-super-plan.md` (`role`, `employer_id`, `internal_notes`) and historically by S1 migrations. No hard dependency between this plan's columns and admin-views', but ship them as separate migrations on different timestamps to avoid merge conflicts. Recommended order: admin-views role enum → events columns → (anything else).

---

## URL Structure

### Channel-tagged event links

Lauren never shares the base event URL. She shares channel-specific links:

```
/events/resume-masterclass-june?src=linkedin
/events/resume-masterclass-june?src=email
/events/resume-masterclass-june?src=instagram
/events/resume-masterclass-june?src=newsletter
```

The `src` param is captured on the registration form and written to `leads.source`. If absent, defaults to `direct`.

For paid campaigns (LinkedIn ads, Meta ads), add `ref` for campaign-level tracking:

```
/events/resume-masterclass-june?src=linkedin&ref=june-retarget-v2
```

---

## Public Routes

### `/events` — Events listing page

**Purpose:** browsable catalog of all upcoming and past events.

**Layout:**

- Hero: "Live sessions with Lauren — free, expert-led, no fluff"
- Upcoming events (cards): title, date/time, type badge, seats remaining, "Register →" CTA
- Past events (below fold): title, date, "Watch replay →" CTA (links to replay_url)
- No auth required to view. Registration requires email only.

**Card contents:**

- Event type badge (Webinar / Workshop / AMA / Masterclass)
- Title + subtitle
- Date + time (user's local timezone via JS)
- Host chip: Lauren's photo + name
- Seats remaining (if max_seats set)
- CTA: "Register free →"

**Empty upcoming state:** "No events scheduled yet — join the waitlist to be first to know." (Loops waitlist form)

---

### `/events/[slug]` — Individual event landing page

**Purpose:** conversion page. Visitor lands here from Lauren's post/email. This is where registration happens.

**Above the fold:**

- Event title (large, editorial)
- Date / time / duration
- Host bio strip (Lauren's photo, 2-line credibility: "15 years recruiting. 1,000+ placements. She's on both sides of the table.")
- Seats remaining indicator
- Registration form (see below)

**Below the fold:**

- What you'll learn (3–4 bullets from Lauren's description)
- What you'll walk away with (concrete outcomes)
- Social proof: recent placement stories / testimonial quotes
- FAQ: "Is this recorded?" / "Do I need to sign up for anything?" / "Is it really free?"
- Trust strip: employer logos, placement count

**Registration form (the most important element):**

```
First name
Email address
[Register for free →]
```

That's it. No phone. No company. No "where did you hear about us" dropdown (that's what the `src` param is for).

On submit:

1. POST `/api/events/register`
2. Writes to `leads` table with `source` from URL param
3. Fires `lead.registered` event to Loops
4. Redirects to `/events/[slug]/confirmed`

**If event is past:** page shows replay embed (if replay_url set) and "Watch the replay" above the fold. Registration form replaced with platform signup CTA.

---

### `/events/[slug]/confirmed` — Post-registration page

**Purpose:** momentum capture. They just registered — this is peak intent.

**Contents:**

- "You're registered. Check your email for the link."
- Calendar add buttons (Google / Apple / Outlook) — generated from event data
- **Platform teaser:** "While you wait — see what Lauren's candidates get access to"
  - Show the live Tier 3 role count: "47 exclusive roles. Members only."
  - CTA: "Get your free ATS score before the webinar →" (links to platform signup)
  - Framing: "Takes 2 minutes. Bring your score to the webinar."
- Share nudge: "Know a Director or VP who should be here? Share →" (pre-filled LinkedIn/WhatsApp share text)

This page drives two actions: platform pre-signups (highest-intent moment) and organic sharing (loop amplification).

---

## API Routes

### `POST /api/events/register`

```typescript
// Body: { eventId, firstName, email, source, sourceRef? }

// 1. Validate event exists + is published + not past
// 2. Check seats (if max_seats set)
// 3. Upsert leads row (email + event_id unique — handle re-registration gracefully)
// 4. Fire Loops event: lead.registered
// 5. Return { success: true, slug }
```

### `POST /api/events/attend` (Lauren triggers post-event, or future webhook)

```typescript
// Body: { eventId, emails: string[] }  OR  { eventId, leadId }

// Marks attended_at on matching leads rows
// Fires Loops event: lead.attended for each
```

### OAuth callback addition (existing `(auth)/callback` route)

After successful OAuth, before redirect to dashboard.

> **Ordering note**: the callback already runs LinkedIn identity sync (per `ec-dev-plan.md` line 20) as a non-blocking step. Lead reconciliation must also be **non-blocking** — wrap in a try/catch and never fail the OAuth redirect on a lead-match error. Order: (1) identity sync (fire-and-forget), (2) lead match + profile stamp (fire-and-forget), (3) redirect to dashboard. Don't await either in a way that gates the redirect.

```typescript
// Check leads table for matching email
const lead = await supabase
  .from("leads")
  .select("*")
  .eq("email", user.email)
  .is("converted_profile_id", null)
  .order("registered_at", { ascending: false })
  .limit(1)
  .single();

if (lead) {
  // Update leads row
  await supabase
    .from("leads")
    .update({
      converted_profile_id: user.id,
      converted_at: new Date().toISOString(),
    })
    .eq("id", lead.id);

  // Stamp profile with acquisition data
  await supabase
    .from("profiles")
    .update({
      lead_id: lead.id,
      acquisition_source: lead.source,
      acquisition_ref: lead.source_ref,
    })
    .eq("id", user.id);

  // Fire Loops event with webinar context
  await loops.track("lead.converted", {
    email: user.email,
    eventSlug: lead.event?.slug,
    source: lead.source,
  });
}
```

If no lead matches, profile is created normally with `acquisition_source = 'direct'`.

---

## Loops Events + Sequences

> **Prerequisite**: `ec-dev-plan.md` §S8 owns the broader Loops event pipeline + account/domain configuration. If S8 hasn't shipped before this sprint, this sprint must include the one-time Loops account creation, domain DNS records, and `LOOPS_API_KEY` env var. Treat that as Day 1 setup work before any `lead.*` event can fire.

### New events

| Event             | Trigger                  | Key properties                                                         |
| ----------------- | ------------------------ | ---------------------------------------------------------------------- |
| `lead.registered` | Registration form submit | `email`, `firstName`, `eventSlug`, `eventTitle`, `eventDate`, `source` |
| `lead.attended`   | Lauren marks attended    | `email`, `eventSlug`, `attendedAt`                                     |
| `lead.converted`  | OAuth signup matched     | `email`, `eventSlug`, `source`, `profileId`                            |

### Email sequences

**Sequence: lead.registered**

- Immediate: "You're in — here's everything for [Event Title]" — calendar link, Zoom link (or "link sent 10 min before"), what to bring (their resume), platform teaser CTA
- Day before: reminder — "Tomorrow: [Event Title] with Lauren. Bring your resume."
- 1 hour before: "Starting in 1 hour →" — direct Zoom/webinar link

**Sequence: lead.attended**

- Immediate (post-event): "You showed up — here's your next step" — replay link (once available), "Get your ATS score now" CTA, specific reference to what was covered
- Day 2 (if no platform signup): "Most people who attended [Event] got their ATS score within 24 hours. Here's yours →"
- Day 5 (if no platform signup): "A few roles came in this week that match what we talked about in [Event]. You need to be in the platform to see them."
- Day 14 (if still no signup): final nudge from Lauren — personal tone, low pressure

**Sequence: lead.registered but did NOT attend (no attended_at after event)**

- Day 1 post-event: "You missed it — here's the replay" — replay link + platform CTA
- Day 3: same conversion sequence as attended, slightly softer

**Sequence: lead.converted (matched to platform signup)**

- Fires instead of (not in addition to) the standard welcome sequence
- "Welcome — you're already ahead" — references the event they came from
- Skips generic onboarding copy, goes straight to "here's your ATS score, here's what you unlocked"

---

## Admin — Lauren's Events View

> **Shell ownership**: the admin layout, route guard, and sidebar shell are owned by `ec-admin-super-plan.md`. This section adds an "Events" sidebar entry + the routes below; it does **not** re-implement the layout, guard, or top-level admin nav. Mirror the pattern used by `/admin/jobs` in `docs/done/ec-job-board-plan.md`.

Routes added inside the admin shell:

| Route                     | Purpose                                                                    |
| ------------------------- | -------------------------------------------------------------------------- |
| `/admin/events`           | Events list + create form                                                  |
| `/admin/events/[id]/edit` | Edit / publish / mark-past / set replay URL                                |
| `/admin/events/[id]`      | Per-event analytics + registrant list + attendance bulk-upload             |
| `/admin/leads`            | Cross-event lead list, filterable by event/source/funnel stage; CSV export |

Sidebar: a new "Events" section in the admin sidebar config (the one owned by admin-views) listing the four routes above. Coordinate with admin-views' sidebar slice work — see "Admin-views slot allocation" below.

### Functional details

Inside the existing admin UI:

### Event management

- Create / edit / archive events
- Fields: title, subtitle, description, type, scheduled_at, duration, max_seats, cover image, replay URL
- Publish toggle (draft → live)
- Mark as past (manual, or auto-flip after scheduled_at + duration)
- Generate channel links (one click → copies LinkedIn / email / Instagram URLs)

### Per-event analytics

- Registrants: count + list (name, email, source, registered_at)
- Attended: count + % of registered (manually mark or bulk upload from Zoom attendance export)
- Converted to platform: count + % of attended
- Converted to paid: count + % of platform signups from this event

### Lead list (cross-event)

- All leads, filterable by: event, source, funnel stage (registered / attended / converted / paid)
- Bulk mark-as-attended (paste Zoom attendance CSV → match by email → stamp attended_at)
- Export to CSV

---

## Lauren's Operational Workflow (Phase 1 — no API integration)

Until Zoom API integration is built, Lauren's post-webinar workflow is:

1. Download Zoom attendance report (CSV: email, name, join time, duration)
2. Go to Admin → Events → [Event] → "Mark Attendees"
3. Upload CSV → system matches by email, stamps `attended_at`, fires `lead.attended` Loops events
4. Done. Sequences fire automatically from there.

This is a 5-minute task per webinar. Acceptable for Phase 1.

**Phase 2 upgrade:** Zoom webhook → `/api/webhooks/zoom` auto-stamps `attended_at` in real time. Lauren does nothing post-webinar.

---

## Sprint Plan

This is a self-contained sprint that can run **in parallel with S3** (paywall) or immediately after. Estimated: **1 week.**

### Schema + API (Day 1–2)

- [ ] Migration: `events` table + RLS
- [ ] Migration: `leads` table + RLS + indexes
- [ ] Migration: `lead_id`, `acquisition_source`, `acquisition_ref` on `profiles`
- [ ] `database.types.ts` updated
- [ ] `POST /api/events/register` route
- [ ] `POST /api/events/attend` route (bulk + single)
- [ ] OAuth callback patched — leads reconciliation logic

### Public UI (Day 2–4)

- [ ] `/events` listing page — card grid, upcoming / past sections
- [ ] `/events/[slug]` landing page — registration form, social proof, FAQ
- [ ] `/events/[slug]/confirmed` — confirmation + platform teaser + share nudge
- [ ] Channel URL generator utility (`buildEventUrl(slug, source, ref?)`)
- [ ] Timezone-aware date display (JS `Intl.DateTimeFormat`)

### Admin UI (Day 4–5)

- [ ] Admin: Events CRUD (create, edit, publish toggle, mark past, set replay URL)
- [ ] Admin: Channel link generator per event (copy LinkedIn / email / Instagram URLs)
- [ ] Admin: Per-event registrant list + attended toggle
- [ ] Admin: Bulk attendance upload (CSV → email match)
- [ ] Admin: Funnel metrics per event (registered / attended / converted / paid)

### Loops (Day 5)

- [ ] `lead.registered`, `lead.attended`, `lead.converted` events wired
- [ ] Registered sequence (3 emails: confirmation, reminder, 1-hour)
- [ ] Attended sequence (3 emails: post-event, day 2, day 5)
- [ ] No-show sequence (2 emails: replay, day 3)
- [ ] Converted sequence (replaces generic welcome for webinar-sourced signups)

---

## What This Unlocks

Once this is live, Lauren's workflow for any webinar becomes:

1. Create event in admin (5 min)
2. Copy channel links (LinkedIn, email, Instagram) — one click each
3. Post to each channel with the correct link
4. Run the webinar
5. Upload Zoom attendance CSV post-event (5 min)
6. Platform handles everything else — sequences fire, conversions are tracked, admin shows the funnel

And for the first time, she'll know: _"My June webinar got 94 registrants. 61 attended. 38 signed up on the platform. 11 paid. LinkedIn drove 52% of registrants but only 30% of conversions. Email drove 28% of registrants but 45% of conversions."_

That's the data that tells her where to spend her energy next.
