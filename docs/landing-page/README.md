# Landing Page Handoff

Hey GT! This is the new landing page, ready to pull into the app. It replaces the current homepage. Everything you need is in this folder, and this doc is written to be dropped straight into Claude as context.

**Live reference:** https://empowered-assessment.vercel.app/landing.html
**Reference build:** [`landing.html`](./landing.html) in this folder. One self-contained file: every token, string, and behavior is readable in place.
**Asset:** [`lauren.jpg`](./lauren.jpg) (Lauren's About-page photo, already sized).

## Why we're changing the homepage

The current homepage sells the private talent network concept: exclusive roles, algorithmic matching, the big-tech logo strip. We can't back those claims right now, and beta testers will land on this page. The new page sells what the product actually does today, so nobody signs up expecting something we can't deliver.

The direction we agreed on: **product first.** The tools are the offer. Coaching is real and priced, but it's the optional human layer, never the price of entry.

## What the page is

One page, seven sections, in order:

1. **Hero.** Eyebrow "Be bold. Be Empowered." Headline "Get hired faster. Get paid what you're worth." with a forced line break so both "Get"s align (each sentence is a block-level span). Subhead, primary CTA to signup, and an animated sample score card on the right.
2. **Companies Lauren has served.** Text-only strip: SpaceX, Warner Bros., Paramount Pictures, McAfee. These come from Lauren's public coaching site, so they're substantiated, unlike the old logo strip.
3. **How it works.** Three steps: get your score, strengthen your story, add a coach when you want one.
4. **Why this is different.** Four cards: nothing invented, your voice, depth on your wins, a real recruiter behind it.
5. **The market right now.** Three sourced stats (Jobvite, LinkedIn, ICF). Sources stay visible.
6. **Meet Lauren.** Photo, short bio, "Be bold. Be Empowered." as the pull quote.
7. **Coaching + final CTA.** Real tiers and prices, then one last signup push.

## Theming

Dark is the only theme at launch. All colors are CSS custom properties at the top of `landing.html`: `:root` holds the dark palette, `[data-theme="light"]` holds an approved light palette for later. If we ever turn on light mode here, use those values. Please don't inherit the app's current light theme; its lime-on-light text fails contrast (roughly 1.3:1) and this palette was built to fix that.

**The one hard rule: lime `#CCFF00` is fill-only.** Dark text on lime chips and buttons. Never lime text or lime icons on a light surface. On dark surfaces lime text is fine (the eyebrows and stat numerals use it).

Key dark tokens:

| Token                      | Value                 | Use                            |
| -------------------------- | --------------------- | ------------------------------ |
| `--bg`                     | `#141412`             | page background                |
| `--surface`                | `#1C1B18`             | cards                          |
| `--ink`                    | `#F2F1EA`             | headings, primary text         |
| `--body`                   | `#C9C6BC`             | paragraph text                 |
| `--muted`                  | `#8F8B80`             | secondary text, passes AA      |
| `--lime`                   | `#CCFF00`             | fills, accents, CTA background |
| `--lime-ink`               | `#141412`             | text on lime                   |
| `--line` / `--line-strong` | `#2E2C27` / `#4A473F` | hairlines / emphasized borders |

Type: Cormorant Garamond for headings, Montserrat for UI. Same brand fonts the app already loads. Sharp corners, hairline borders, no shadows.

## Behavior

All JavaScript is in the single script tag at the bottom, about 40 lines:

- Score card count-up and bar fill when it scrolls into view.
- Gentle fade-up reveals on sections.
- Mobile menu toggle (nav collapses to a hamburger below 760px).
- Everything is instant or disabled under `prefers-reduced-motion`.

The hero also has a faint grid texture via a `::before` pseudo-element, and the nav uses `color-mix()` for its backdrop. Both are fine in evergreen browsers.

## Routes

Already wired in the file: Get started goes to `/login?tab=signup`, Log in to `/login`, footer Contact to `mailto:Lauren@empowered-careers.com` (absolute URLs in the reference since it lives off-domain; make them relative in the app). Still `#` placeholders: coaching tier CTAs, single sessions, both LinkedIn links, Privacy, Terms.

## Beta rule (important)

Lauren's call from Sep 1: **no coaching bookings during beta.** Coaching gets offered at the exit survey. So for the beta cohort, disable or de-emphasize the three tier buttons and the single-sessions link. They come back at public launch.

## The score card is a sample

The three dimension names on the hero card (Impact evidence, Recruiter readability, Search visibility) are placeholders I wrote. When you implement, swap in the real dimension names and, ideally, a real report render. If the numbers stay illustrative, keep the "Sample report shown for illustration" caption.

## Do not carry over from the old homepage

Exclusive-roles copy, the Google/Meta/Amazon strip, "Trusted by 100+", the anonymous testimonial, "80% of our roles", "Join the 1%", "top 5% fit", the blurred fake job board, and the full-screen loading gate.

## Meta

Title, description, and OG tags are in the head of `landing.html`, written for the new positioning. Worth shipping together with the new domain when that lands.

## Open items

- Lauren to confirm we can use her photo and the client-company names here (they're public on her site, but this is the product site).
- Lauren to confirm the coaching prices shown are what the public should see.
- Real score dimensions and a real report render from you.

Questions or anything that doesn't translate cleanly to the app, ping me. Excited to see this live!

Whitney
