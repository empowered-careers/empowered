# Coaching Catalog Setup — Runbook

> For: Lauren (Stripe + admin console), GT (the two open items in §5)
> Prerequisite: the §2 pivot migration must be applied first, or the admin form
> won't have the `kind` / `stripe_price_id` / `booking_url` fields and every
> save will be rejected by RLS.
> Source of truth for names and prices: `docs/prototypes/pricing.html`.

Once this is done, every product on the platform is purchasable and a candidate
can pay for it. Nothing here needs an engineer.

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

| Name       | Tier     | Price  | Sessions | Price ID (paste here) |
| ---------- | -------- | ------ | -------- | --------------------- |
| Foundation | Silver   | $450   | 3        |                       |
| Momentum   | Gold     | $1,400 | 8        |                       |
| Executive  | Platinum | $2,400 | 13       |                       |

### Individual sessions and services

| Name                     | Tier     | Price | Price ID (paste here) |
| ------------------------ | -------- | ----- | --------------------- |
| Resume Refresh           | Silver   | $125  |                       |
| LinkedIn Glow-Up         | Silver   | $150  |                       |
| NorthStar Discovery      | Gold     | $175  |                       |
| Market Intel Session     | Gold     | $175  |                       |
| Mock Interview           | Gold     | $200  |                       |
| Executive Bio            | Platinum | $250  |                       |
| Background & Social Prep | Platinum | $200  |                       |
| 90-Day Check-In          | Platinum | $150  |                       |

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

Proposed classification — **Lauren to confirm the two marked ⚠️**:

| Product                  | Kind                                                                   |
| ------------------------ | ---------------------------------------------------------------------- |
| Resume Refresh           | `session`                                                              |
| LinkedIn Glow-Up         | `session`                                                              |
| NorthStar Discovery      | `session`                                                              |
| Market Intel Session     | `session`                                                              |
| Mock Interview           | `session`                                                              |
| 90-Day Check-In          | `session`                                                              |
| Executive Bio            | `service` ⚠️ — written for the candidate; is there a live intake call? |
| Background & Social Prep | `service` ⚠️ — is this a review you deliver, or a working session?     |

If either ⚠️ is actually a booked call, set it to `session` and give it a
booking URL in §4.

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

Until this is decided, **sell the eight individual products and leave the three
bundles inactive** — everything else in this runbook works without it.

### 5b. Course content

There are no `kind = course` products above, because no course content exists
yet. When it does: create the product, set kind to `course`, and put the
unlisted Vimeo/YouTube URL in the External URL field.

---

## 6. Check it works

Do this once, with a real card, on the first product you set up:

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

- [ ] 11 Stripe products created, all one-time prices, price IDs copied
- [ ] Two ⚠️ session/service classifications confirmed (§3)
- [ ] 8 individual products created in `/admin/coaching`, active, with price IDs
- [ ] Coach rows added for Whitney and Lauren
- [ ] Cal.com event types created, booking URLs pasted for every `session`
- [ ] Bundle contents decided (§5a) — then the 3 bundles activated
- [ ] End-to-end test purchase passed (§6)
