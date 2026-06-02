# Notifications system

## Context

The bell icon in the top nav (`src/components/app-shell/top-nav.tsx:104-112`) is a placeholder with no click handler. Today, candidate-facing realtime hooks (`use-application-notifications.ts`, `use-resume-notifications.ts`, `use-linkedin-notifications.ts`) fire Sonner toasts on source-table changes but nothing is persisted — so the unread badge, history, and "mark all read" UX of the mockup are not possible.

This plan adds a persistent `notifications` table, fans events into it from the existing source-of-truth code paths, and wires a Popover panel behind the bell. The dashboard "nudges grid" is a separate concern tracked in `docs/ec-dashboard-ui-plan.md` — nudges are derived state, not stored notifications.

---

## Notifications vs. Nudges

These are two distinct systems and must not be merged. The same underlying event (e.g. an application moving to `interviewing`) can legitimately produce **both** a notification and a nudge.

|                     | **Notification** (this plan)                                          | **Nudge** (`ec-dashboard-ui-plan.md`)                                                   |
| ------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Nature**          | An event — "this just happened"                                       | A state — "this is true about you right now"                                            |
| **Lifecycle**       | Persisted; lives in the feed until read/cleared                       | Recomputed every render; disappears when the underlying state changes                   |
| **Source of truth** | `notifications` table row, written at the moment a source row mutates | `computeNudges()` derived from current profile/resume/blueprint/pipeline data           |
| **Trigger**         | Event-driven (status change, job complete, payment)                   | State-driven (profile incomplete, free plan + available matches, interview in progress) |
| **Surface**         | Bell popover + `/notifications` history                               | Dashboard "For your attention" grid                                                     |
| **User actions**    | Mark read, mark all read                                              | Act on the CTA (acting changes the state, so it self-clears)                            |
| **Cardinality**     | One per event (4 status changes → 4 notifications)                    | Ranked + capped (4 status changes → 1 pipeline nudge)                                   |

Rule of thumb: if removing it requires the user to _click "dismiss"_, it's a notification. If it disappears on its own once the user _does the thing_, it's a nudge.

A status change therefore writes a `notifications` row here (ephemeral toast + persistent feed entry) **and** is read live by `computeNudges()` to surface a standing "interview in progress" card on the dashboard. Neither system reads the other's storage.

---

## 1. Schema

Add a Supabase migration under `supabase/migrations/`:

```sql
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  type        text not null,           -- 'application_status' | 'resume_complete' | 'match_created' | 'linkedin_sync' | 'payment_succeeded' | 'assessment_complete'
  title       text not null,
  body        text,
  href        text,                    -- deep link, e.g. '/pipeline' or '/job-board?id=...'
  metadata    jsonb default '{}',
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_profile_recent_idx on notifications (profile_id, created_at desc);
create index notifications_profile_unread_idx on notifications (profile_id) where read_at is null;
```

- RLS: `profile_id = auth.uid()` for `select` and `update`. Only `service_role` (or trigger functions) can `insert`.
- Add to the `supabase_realtime` publication; default replica identity is fine because we only need the INSERT event.

After the migration, run `npm run supabase:types` and add aliases to `src/types/db.ts`:

- `Notification = Tables<"notifications">["Row"]`
- `NotificationType` union matching the `type` column values.

## 2. Server writer

`src/app/actions/notifications.ts` (server-only):

- `createNotification({ profileId, type, title, body, href, metadata })` — called by API routes, server actions, and background jobs at the moment they update the source row. Uses the server Supabase client (which respects RLS) with a service-role fallback for webhook contexts.
- `markNotificationRead(id)` — sets `read_at = now()` for the current user's row.
- `markAllRead()` — sets `read_at = now()` where `profile_id = auth.uid() and read_at is null`.

Fan-out points (each calls `createNotification` after the source mutation succeeds):

- Application status change — wherever `applications.status` is updated (admin actions, pipeline actions).
- Resume parsing complete — background worker that flips `resumes.status = 'complete'`.
- Match created — background matcher.
- LinkedIn sync complete.
- Payment success — Razorpay webhook.
- Assessment complete — wherever `assessment_responses` is written with a final state.

The existing realtime hooks (`use-application-notifications.ts` et al.) stay: they continue to toast on source-table changes. This plan does **not** move toasts into the notifications hook — toasts are ephemeral domain UX; the notifications table is the persistent record.

## 3. Client feed hook

New `src/hooks/use-notification-feed.ts`:

- Fetches the latest 30 notifications via TanStack Query, key `queryKeys.notifications.feed(userId)` (add to `src/lib/query-keys.ts`).
- Subscribes to `postgres_changes` INSERT on `notifications` filtered by `profile_id=eq.${userId}`. On insert: prepend to cache, bump unread count.
- Returns `{ notifications, unreadCount, markRead, markAllRead, isLoading }`.

Mount once via the existing client wrapper in `src/components/providers/realtime-notifications.tsx` so the feed stays warm across navigation.

## 4. Bell panel UI

Install `Popover` via `npx shadcn@latest add popover`. Replace the placeholder bell in `top-nav.tsx:104-112` with `<NotificationBell />`.

New components (all client):

- `src/components/notifications/notification-bell.tsx` — Popover trigger wrapping the existing `Bell` icon. Renders a red dot or numeric badge in the top-right corner when `unreadCount > 0`.
- `src/components/notifications/notification-list.tsx` — panel body (~360px wide). Header: "Notifications" + "Mark all read" button. List rendered from `useNotificationFeed()`. Empty state: "You're all caught up." Footer link "View all" → `/notifications` (stub the page for now).
- `src/components/notifications/notification-item.tsx` — single row: type-based Lucide icon, title (bold), body (muted, 1 line), relative time. Click marks read via `markRead(id)` then navigates to `href`.

## Files to add / modify

**New:**

- `supabase/migrations/<timestamp>_create_notifications.sql`
- `src/app/actions/notifications.ts`
- `src/hooks/use-notification-feed.ts`
- `src/components/notifications/notification-bell.tsx`
- `src/components/notifications/notification-list.tsx`
- `src/components/notifications/notification-item.tsx`
- `src/components/ui/popover.tsx` (shadcn add)
- `src/app/notifications/page.tsx` (stub "View all" page)

**Modify:**

- `src/types/db.ts` — add `Notification`, `NotificationType`.
- `src/lib/query-keys.ts` — add `queryKeys.notifications.*`.
- `src/components/app-shell/top-nav.tsx` — replace bell placeholder with `<NotificationBell />`.
- `src/components/providers/realtime-notifications.tsx` — mount `useNotificationFeed()`.
- Source-side code paths (server actions and background routes) — call `createNotification` at each fan-out point listed in §2.

## Verification

1. `npm run supabase:types` after migration; `Notification` row type present in `src/types/database.types.ts`.
2. `npm run type-check && npm run lint` clean.
3. `npm run dev`, log in:
   - Click bell → popover opens, empty state visible.
   - From another tab/admin path, trigger an action that calls `createNotification` (e.g., move an application to `interviewing`) → bell badge updates without a refresh; the existing application toast also fires.
   - Click an item → navigates to `href`, `read_at` set, badge decrements.
   - "Mark all read" clears the badge and updates all rows.
   - Reload — unread count and history persist.
4. RLS sanity: with two test users via the Supabase JS client, user A cannot select user B's notifications.
5. `npm run build` succeeds.
