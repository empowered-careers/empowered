# Role Clarity — assessment spec

**Status: shipped.** Implemented in `src/lib/assessment/role-clarity.ts`, scoring pinned by
`src/lib/assessment/role-clarity.check.ts`, surfaced at `/assessments/role-clarity`.

## Provenance

This spec was **reverse-engineered, not exported.** The original lives in a Claude artifact
(`02603df4-8125-47c5-b2e9-03b279569c56`) whose published viewer has no code export and renders
cross-origin in a sandbox, so the source was unreachable. `docs/role clarity.html` — a saved
claude.ai page someone dropped in `docs/` — contained only 726 characters of sidebar chrome and has
been deleted.

Instead the assessment was run four times in the browser and everything below was recovered from
the rendered output. The scoring model is not inferred: it reproduces all four measured totals
exactly (18, 36, 52, 77 out of 78), including the per-section split on the 52 run. Those four
vectors are the fixtures in `role-clarity.check.ts`.

## The recovered spec

### Framing

- Eyebrow: `ROLE CLARITY ASSESSMENT`
- Title: **"Which role should you actually be targeting?"**
- Intro: "18 quick questions — about 5 minutes. This looks at what you've actually done, not just
  your title, and tells you where your search is clear and where it's still fuzzy."

### Structure

6 sections × 3 questions = 18. Every section is **1 Likert (1–5) + 2 multiple-choice (1–4)**,
so every section maxes at **13** and the overall maxes at **78**. Minimum is 18.

### Scoring

**Every question scores by its 1-based option index.** Likert 1–5 → 1–5; choice questions → 1–4.
Section score = sum of its 3 questions. Overall = sum of sections.

Verified: answering all-3s/all-3rd-options gave Title 9, Scope 9, Company 8, Industry 9,
Leadership 9, Market 8 = **52/78**, exactly matching the rendered "Overall score: 52 / 78".
All-lowest gave **18/78**; near-highest gave **77/78**; all-2nd-options gave **36/78**.

### Questions

**S1 — Title & Positioning Clarity**

1. _(Likert, "Not confident" → "Very confident")_ How confident are you that the job title on your
   resume matches the actual seniority and scope of what you've done?
2. When you describe your role to a recruiter, does your explanation match what you actually did, or
   just what your title says?
   - I mostly repeat my title, not what I actually did
   - I get vague and lose the recruiter's attention
   - I describe my real scope but stumble over the right title for it
   - I have a tight explanation that pairs the right title with clear scope
3. Do you know the 2-3 job titles you should actually be applying under right now?
   - No — I'm applying to whatever looks close enough
   - I have a guess but haven't verified it against anything
   - I have one solid title but haven't explored the alternates
   - Yes — I know exactly which titles fit and why

**S2 — Scope & Impact**

4. _(Likert, "Can't quantify it" → "Have numbers ready")_ How easily can you quantify your biggest
   professional impact — dollars, percentages, team size, users, time saved?
5. Which best describes the work you're most proud of?
   - I maintained or operated something that already existed
   - I improved an existing process or system
   - I built something new, but with a clear spec and a lot of guidance
   - I built something new starting from an ambiguous, open-ended problem
6. How much decision authority did you actually have in your last role?
   - I only executed what I was told to do
   - I could recommend a direction but not decide
   - I could decide within a defined scope or budget
   - I owned the budget, roadmap, or decision outright

**S3 — Company Size & Culture Fit**

7. _(Likert, "No idea" → "Very clear")_ How clear are you on which company size or stage — startup,
   growth-stage, enterprise — you do your best work at?
8. Thinking back to your best role, what best describes that environment?
   - Small team, high ambiguity, very few defined processes
   - Growing company — some process in place, but still flexible
   - Established company with clear process and structure
   - Large enterprise — defined roles and formal approval chains
9. Where is your current search actually focused?
   - Applying broadly, regardless of company size
   - Leaning toward whatever's similar to my last job, without really deciding
   - I've picked a target size but haven't tested whether it's right
   - I've deliberately chosen a size and stage based on what's actually worked for me

**S4 — Industry & Transferability**

10. How many distinct industries have you worked in?
    - Not sure how to count it / 0-1 / 2-3 / 4 or more
11. _(Likert, "Not confident" → "Very confident")_ How confident are you that you know which of your
    skills transfer across industries, and which are industry-specific?
12. Is your search targeting the same industry as your last role, or exploring new ones?
    - Same industry only — I haven't considered alternatives
    - Mostly the same, open to a couple of others
    - Actively exploring 2-3 adjacent industries
    - I know exactly which industries fit and why

**S5 — Leadership Trajectory**

13. _(Likert, "Not clear at all" → "Completely clear")_ How clear are you on whether you want to be
    an individual contributor, a player-coach, or a full-time people manager next?
14. How do you feel about managing people day to day?
    - I've never managed and don't know if I'd want to
    - I've managed before and it drained me
    - I've managed before — it's fine, not a strong pull either way
    - I've managed before and genuinely want more of it
15. In your last role, how often did you mentor, train, or informally lead others without it being
    your official job?
    - Never / Occasionally / Regularly / It was basically my unofficial job

**S6 — Market Direction & Demand Awareness**

16. _(Likert, "Not confident" → "Very confident")_ How confident are you that the role or title
    you're targeting will still be in demand 2-3 years from now?
17. Have you researched how your target role is actually changing right now — skills rising or
    falling, titles shifting?
    - No
    - I've seen general headlines, nothing specific to my role
    - I've looked into my specific role a bit
    - Yes, and I've adjusted my target titles or skills because of it
18. Are your target titles aimed at where the market is right now, or where it's actually heading?
    - I'm targeting the same type of role I've always had
    - A mix
    - Mostly forward-looking titles
    - Not sure how to tell the difference

### Result bands (3, confirmed by replay)

| Observed | Label                           | Headline                                                                           | CTA heading                                             |
| -------- | ------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 18       | `STILL SEARCHING FOR YOUR LANE` | "You've got real experience — it's just not translated into a clear target yet."   | "Book a strategy call to **nail down** your target"     |
| 36, 52   | `GETTING WARMER`                | "You're closer than it feels — a few specific gaps are keeping your search fuzzy." | "Book a strategy call to **pinpoint** your target"      |
| 77       | `DIALED IN & READY TO TARGET`   | "You know your lane. Let's make sure the market agrees."                           | "Book a strategy call to **pressure-test** your target" |

Body copy:

- Band 1: "Right now your search is likely spread across too many directions, or anchored to a title
  that undersells or oversells what you've actually done. That's completely fixable, and it's
  usually the fastest-moving fix we make."
- Band 2: "You've got a real sense of direction, but there are specific gaps keeping you from
  applying with full confidence. Closing these is usually where we see candidates start applying
  faster and hearing back more."
- Band 3: "You've already done the hard part of figuring out where you fit. At this stage, the
  highest-leverage move is usually pressure-testing that target against real postings."

**Exact thresholds are not recoverable from the rendered output** — only bracketed:
band1/band2 boundary is in (18, 36]; band2/band3 boundary is in (52, 77]. Use **≤30 / 31–59 / ≥60**
(≈40% and ≈75% of 78) — consistent with every observation — and mark it `ponytail:` as a tuned
constant.

### Result page composition

1. Band label + headline + body.
2. `Overall score: N / 78`.
3. **"Your biggest opportunity right now"** callout — the **lowest-scoring section**, ties broken by
   section order (verified: an all-equal run picked S1). Shows that section's action tip.
4. Six section bars with `n/13`; the weak section's bar renders amber, the rest teal.
5. "Here's your action tip for every category" — one card per section.
6. CTA block, then "Retake the assessment".

Action tips (one per section, reused in the callout):

- **Title & Positioning Clarity** — "Draft a one-sentence positioning statement that names your
  actual scope, not just your title — and test it in your next 3 conversations."
- **Scope & Impact** — "Go back through your last two roles and attach one hard number to each
  accomplishment. Even a rough estimate beats a vague description."
- **Company Size & Culture Fit** — "List the two company sizes where you've done your best work, and
  filter your next 10 applications down to just those."
- **Industry & Transferability** — "Write down which 3 of your skills would survive a move to a
  completely different industry — those are your safest pivot points."
- **Leadership Trajectory** — "Decide, on paper, whether you want to manage people again before your
  next role — don't let the next offer decide it for you."
- **Market Direction & Demand Awareness** — "Spend 20 minutes this week reading 5 current postings
  for your target title and note what's different from postings two years ago."

---

## Two defects in the source to fix during the port

1. **Q18 is inverted.** "Not sure how to tell the difference" sits at index 4 and therefore scores
   **highest**. Proof: the max run could only reach 77/78 while answering sensibly; the missing
   point requires answering "Not sure". **Fix:** reorder so "Not sure" is index 1, or give it an
   explicit weight of 1.
2. **Q8 measures preference, not clarity.** Its options run small-team → large-enterprise and are
   scored 1–4, so preferring an enterprise scores 4 and preferring a startup scores 1 — on a
   _clarity_ assessment. **Recommendation: ship it as-is** and log it. Dropping it from the total
   changes S3's max from 13 to 9 and invalidates all four verified fixtures, so it is not a code
   fix — it is a content decision for whoever owns the assessment. Keep the answer in the result
   blob as a stage-preference signal regardless; it is useful even if the scoring changes later.
   Q18, by contrast, is an unambiguous ordering bug and should be fixed now.

Q18's ordering bug **is fixed in the port** — `role-clarity.ts` puts "Not sure how to tell the
difference" at index 0. Q8 ships as-is; changing it moves S3's max from 13 to 9 and invalidates
every fixture above, so it is a content decision, not a code fix.

---

## Implementation notes

- **No schema change.** Reuses `assessment_responses` (`UNIQUE (profile_id, assessment_id)`,
  per-assessment `responses`/`result` jsonb, `FOR ALL` self-access RLS). Seeded by
  `supabase/migrations/20260819120000_role_clarity_assessment_seed.sql`.
- **Synchronous scoring**, like the Blueprint — `src/app/actions/role-clarity.ts` computes and
  returns the result in the request that writes it. No Inngest, no Realtime hook.
- **`candidate_scores.role_clarity_score` is normalised min-max**, `(raw - 18) / 60 * 100`, not
  `raw / 78`. The floor is 18, so dividing by the max would report an all-middle answer as 67 —
  above the `WEAK = 60` cutoff in `src/lib/dashboard/prescribe.ts` — when it should read as a gap.
- **The Blueprint no longer clobbers it.** `submitBlueprint` derives `role_clarity_score` from
  driver concentration; it now omits that column when a Role Clarity response exists, so a
  Blueprint retake can't overwrite the better signal.
- **The results CTA routes through `prescribe()`**, so it can never disagree with the dashboard
  nudge about what this candidate needs next.
