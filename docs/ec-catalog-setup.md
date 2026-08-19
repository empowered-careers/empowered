# Coaching Catalog Setup — Runbook

> For: Lauren (Stripe + admin console), GT (the two open items in §5)
> Prerequisite: the §2 pivot migration must be applied first, or the admin form
> won't have the `kind` / `stripe_price_id` / `booking_url` fields and every
> save will be rejected by RLS.
> Source of truth for names and prices: `docs/prototypes/pricing.html`.

Once this is done, every product on the platform is purchasable and a candidate
can pay for it. Nothing here needs an engineer.

> **Status, 2026-08-19.** §1 and §2 are done in the **sandbox** account
> (`acct_1TZ924EGUAd5NiUm`), which is what `STRIPE_SECRET_KEY` in `.env.local`
> points at. All 11 products exist with one-time USD prices, every
> `coaching_products.stripe_price_id` is filled in, and `bundle_contents` is
> mapped — so §5a is closed and the bundles are live too.
>
> **Going live is a second pass.** Price IDs are per-account-per-mode, so the
> live account (`acct_1TZ8yRE5B4ZVxh4l`) needs its own 11 products and a
> re-run of the §2 price IDs against live keys. An identical set was created in
> that account's _test_ mode by mistake and archived — ignore it.

---

## 0. Ground rules

- **Every price is a one-time payment.** Do **not** create recurring/subscription
  prices — the platform has no subscription path any more, and a recurring price
  will be rejected at checkout.
- **Currency: USD.**
- **Names must match the table below exactly.** The Stripe product name is what
  the payment record gets categorised by (`resume` / `linkedin` / `interview`
  keywords drive reporting), so renaming changes the reports.
- The "Career Symmetry 360" umbrella name is **not** used on the platform. The
  individual tier and session names carry over unchanged.

---

## 1. Stripe — create 11 products

In the Stripe Dashboard → Products → **+ Add product**. For each row: set the
name, add a **one-time** price at the amount shown, save, then copy the **price
ID** (starts with `price_`, _not_ the product ID `prod_`) into the last column.

### Bundles

| Name       | Tier     | Price  | Sessions | Price ID (sandbox)               |
| ---------- | -------- | ------ | -------- | -------------------------------- |
| Foundation | Silver   | $450   | 3        | `price_1U6APQEGUAd5NiUmppyfQZNg` |
| Momentum   | Gold     | $1,400 | 8        | `price_1U6AR9EGUAd5NiUmjTwHZjXo` |
| Executive  | Platinum | $2,400 | 13       | `price_1U6ARLEGUAd5NiUmQEeFP4rv` |

### Individual sessions and services

| Name                     | Tier     | Price | Price ID (sandbox)               |
| ------------------------ | -------- | ----- | -------------------------------- |
| Resume Refresh           | Silver   | $125  | `price_1U6AN2EGUAd5NiUmg2DN4x4M` |
| LinkedIn Glow-Up         | Silver   | $150  | `price_1U6ANfEGUAd5NiUm1ptmWoGa` |
| NorthStar Discovery      | Gold     | $175  | `price_1U6AO1EGUAd5NiUmGe4fGqsd` |
| Market Intel Session     | Gold     | $175  | `price_1U6AOXEGUAd5NiUmdSnOIWSv` |
| Mock Interview           | Gold     | $200  | `price_1U6AOeEGUAd5NiUmd9sN0ZrI` |
| Executive Bio            | Platinum | $250  | `price_1U6AOrEGUAd5NiUmrmlQO7VK` |
| Background & Social Prep | Platinum | $200  | `price_1U6AP6EGUAd5NiUm1Y3uRbMK` |
| 90-Day Check-In          | Platinum | $150  | `price_1U6APHEGUAd5NiUmCvdcBZp9` |

> The 22-deliverable breakdown table on the pricing page is **display copy
> only**. Those individual à-la-carte prices ($125–$250 per deliverable) are
> shown for comparison — do not create Stripe products for them.

---

## 2. Admin console — create the 11 rows

`/admin/coaching` → **New product**, one per row above.

| Field           | What to enter                                                        |
| --------------- | -------------------------------------------------------------------- |
| Name            | Exactly as in §1                                                     |
| Kind            | `bundle` for the three tiers; `session` or `service` per §3          |
| Price           | Same amount as the Stripe price (display only — Stripe is authority) |
| Stripe price ID | The `price_...` value from §1                                        |
| Coach           | Only for `kind = session` — see §4                                   |
| Booking URL     | Only for `kind = session` — see §4                                   |
| Description     | The one-line blurb from `docs/prototypes/pricing.html`               |
| Active          | On                                                                   |

**The Stripe price ID is what makes a product purchasable.** A row without one
renders on the pricing page with a disabled button.

---

## 3. Kind: session vs service

`session` means the candidate books time on a calendar. `service` means Lauren
or Whitney produces a deliverable with no live booking. This determines whether
a booking link is shown after purchase.

As built — both ⚠️ rows were set to `session` in the DB, so every product shows
a booking link. Flip either to `service` if it really has no live call:

| Product                  | Kind                                                                   |
| ------------------------ | ---------------------------------------------------------------------- |
| Resume Refresh           | `session`                                                              |
| LinkedIn Glow-Up         | `session`                                                              |
| NorthStar Discovery      | `session`                                                              |
| Market Intel Session     | `session`                                                              |
| Mock Interview           | `session`                                                              |
| 90-Day Check-In          | `session`                                                              |
| Executive Bio            | `session` ⚠️ — written for the candidate; is there a live intake call? |
| Background & Social Prep | `session` ⚠️ — is this a review you deliver, or a working session?     |

---

## 4. Coaches and booking links

**Coaches.** Add a row per coach (Whitney, Lauren) with name, short bio,
specialty tags, and a photo URL. The coach card appears on every
`kind = session` product, so a product with no coach set renders without one.

**Booking links.** We're on a single shared Cal.com account with **one event
type per product** — so each `session` product needs its own link, even when
the same coach delivers several of them.

For each `session` product: create the Cal.com event type (name it after the
product, set the duration), then paste its booking URL into the product's
Booking URL field.

All six currently share the one Calendly 30-min link, which is why
`bookingHref()` tags the URL with the enrollment id — the URL alone can't say
which purchase a booking belongs to. Replace with per-product links:

| Product              | Duration | Coach | Cal.com booking URL |
| -------------------- | -------- | ----- | ------------------- |
| Resume Refresh       |          |       |                     |
| LinkedIn Glow-Up     |          |       |                     |
| NorthStar Discovery  |          |       |                     |
| Market Intel Session |          |       |                     |
| Mock Interview       |          |       |                     |
| 90-Day Check-In      |          |       |                     |

---

## 5. Open items — need a decision before bundles work

### 5a. What does each bundle actually grant? (blocks bundle purchases)

A bundle purchase grants the buyer one enrollment per product it contains. That
mapping has to be filled in, and only one of the three is unambiguous:

**Foundation ($450, 3 sessions)** maps cleanly onto three existing products:

- LinkedIn Glow-Up ("LinkedIn optimized for SEO")
- Resume Refresh ("repackaged resume")
- Mock Interview ("1 mock interview session")

**Momentum (8 sessions)** and **Executive (13 sessions)** do not. Their contents
are described in terms of the six modules — "Career Navigator: LinkedIn
backstage pass, target list, live search, hidden opportunities, market trends",
"Mindset Mastery", "Seamless Start" — and most of those aren't among the eight
individual products. The session counts don't decompose either: Foundation's 3
plus NorthStar plus "Career Navigator" plus "interview prep & debrief" only
reaches 8 if Career Navigator counts as three sessions.

Two ways to resolve it:

1. **Add the missing pieces as products.** Create rows for the module
   deliverables the bundles include (Career Navigator, Mindset Mastery, Seamless
   Start, Interview Prep & Debrief, …), each with a price, and list them in the
   bundle contents. Cleanest — the buyer sees exactly what they own, and each
   piece becomes individually sellable later.
2. **Bundles grant one enrollment and delivery is tracked manually.** No
   contents mapping; Lauren schedules the sessions by hand against the single
   bundle enrollment. Zero setup now, but nothing in the product knows how many
   of the 8 or 13 sessions have been used.

**Resolved (option 1, partially): bundles grant the existing products.**
`bundle_contents` maps Foundation → 3, Momentum → 5, Executive → 8 of the
individual products. The module deliverables that have no product row
(Career Navigator, Mindset Mastery, Seamless Start) are _not_ granted — the
session counts on the pricing page still exceed what a buyer gets an
enrollment for, and Lauren schedules the remainder by hand. Add product rows
for those modules when you want them tracked.

### 5b. Course content

There are no `kind = course` products above, because no course content exists
yet. When it does: create the product, set kind to `course`, and put the
unlisted Vimeo/YouTube URL in the External URL field.

---

## 6. Check it works

Do this once on the first product you set up. In the sandbox use test card
`4242 4242 4242 4242`; in live mode use a real card and refund it after.

1. Log in as a candidate (not your admin account) and open `/pricing`. The
   product should be listed with an enabled buy button.
2. Buy it. You should land on the checkout success page, and — for a `session`
   product — see the booking link.
3. In `/admin/coaching`, the purchase should appear as an enrollment against
   that candidate.
4. Confirm the candidate's account did **not** gain job board access. À la carte
   purchases never unlock it; if it did, stop and flag it.

Then refund yourself in Stripe.

---

## 7. Checklist

- [x] 11 Stripe products created, all one-time prices, price IDs copied (sandbox)
- [x] Two ⚠️ classifications: both are `session` in the DB, not `service` (§3)
- [x] All 11 products in `/admin/coaching`, active, with price IDs
- [x] Bundle contents mapped (§5a) — all 3 bundles active
- [ ] Coach rows: one coach is set on every session; confirm Whitney's row exists
- [ ] Per-product booking links — every `session` currently shares the one
      Calendly 30-min link, so a booking can't be told apart by URL (§4)
- [ ] `STRIPE_WEBHOOK_SECRET` verified against a real endpoint — without a match,
      checkout succeeds and no enrollment is created
- [ ] End-to-end test purchase passed (§6)
- [ ] Live-mode pass: 11 products in `acct_1TZ8yRE5B4ZVxh4l`, price IDs swapped,
      live keys deployed
