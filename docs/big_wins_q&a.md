# Big Wins Q&A Framework

A resume-mapped question engine for surfacing quantified achievements.

## How This Works (Product Flow)

**Step 1 — Resume Upload.** Candidate uploads or pastes their current resume. The system parses it into a role list: Company, Title, Dates, and any bullets already present under each role.

**Step 2 — Role-by-Role Loop.** For each role (most recent first — memory is freshest there), the candidate answers a short, targeted Q&A pulled from the category bank below. Only surface 4–6 questions per role at a time so it doesn't feel like homework — start with the categories most relevant to that title (mapping guide in Section 3), and offer "show more questions" rather than dumping all categories at once.

**Step 3 — Capture & Convert.** Every answer gets run through the "vague → quantified" pattern (Section 4) before it's saved, so what lands in the candidate's profile is already a strong, metric-forward bullet — not a raw paragraph.

**Step 4 — Gap Prompt.** If a role has zero numbers attached after the loop, trigger the "Reconstruction Path" (Section 5) — a fallback for candidates who insist they "don't have any numbers."

## Section 1: Opening Frame (show once, before the first role)

> "We're going to go role by role and pull out the impact behind what you did — not just your responsibilities. Most people undersell themselves here, not because the work wasn't impressive, but because they never had to put a number on it before. If you don't remember an exact figure, a solid estimate is completely fine — just say 'roughly' or 'about.' Let's start with your most recent role."

## Section 2: Master Q&A Bank (by category)

Each entry has three parts:

- **Ask** — the question shown to the candidate
- **Dig deeper** — a follow-up if the first answer is vague or empty
- **Example flip** — a real vague-to-quantified transformation, for the candidate's reference

### A. Revenue & Sales Impact

- **Ask:** Did anything you did directly generate, protect, or influence revenue? How much, and over what time period?
- **Dig deeper:** Even indirectly — did your work help close deals, retain accounts, expand a book of business, or unlock new markets? What was the deal size, account value, or market size?
- **Example flip:** "Worked with sales team on client accounts" → "Supported a $2.4M portfolio of 18 enterprise accounts, contributing to a 15% year-over-year growth in renewals"

### B. Cost Savings & Efficiency

- **Ask:** Did you reduce spend, cut waste, eliminate a manual process, or make something faster/cheaper? What was the before-and-after?
- **Dig deeper:** Think about time saved per task multiplied by how often that task happened. Even "saved 3 hours a week" becomes real when you multiply it across a team and a year.
- **Example flip:** "Improved the invoicing process" → "Automated the invoicing workflow, cutting processing time from 5 days to 1 and saving an estimated $40K/year in labor hours"

### C. Scale, Scope & Size

- **Ask:** How big was what you managed — budget, team size, number of accounts, users, locations, SKUs, transactions, or geographic reach?
- **Dig deeper:** What's the largest single project, launch, or initiative you owned end-to-end? What would happen if you described its size the way you'd describe it to an investor?
- **Example flip:** "Managed a project" → "Led a $1.2M platform migration across 6 regional offices and 140 end users with zero downtime"

### D. Quality & Performance Metrics

- **Ask:** Did you improve accuracy, reduce errors/defects, hit or beat a performance target, or improve a score (CSAT, NPS, SLA compliance, uptime, etc.)?
- **Dig deeper:** Was there a "before" state that was a known pain point? What was it measured at before you touched it, and after?
- **Example flip:** "Responsible for QA on releases" → "Reduced post-release defect rate by 32% over two quarters by redesigning the QA checklist and catching issues pre-launch"

### E. Speed & Time-to-Value

- **Ask:** Did you make something happen faster — a launch, a hire, a turnaround time, an approval cycle, a delivery timeline?
- **Dig deeper:** Compare the old timeline to the new one. Even "we used to take 2 weeks, now it's 3 days" is a strong, concrete stat.
- **Example flip:** "Streamlined onboarding" → "Cut new-hire onboarding time from 3 weeks to 5 days, accelerating time-to-productivity by 70%"

### F. Retention & Loyalty

- **Ask:** Did your work help keep customers, employees, members, or clients from leaving? What was the retention rate, churn reduction, or renewal rate?
- **Dig deeper:** Think about who was at risk of leaving before you got involved, and what changed after.
- **Example flip:** "Improved customer support" → "Reduced customer churn by 12% by rebuilding the support escalation process, protecting roughly $500K in annual recurring revenue"

### G. Team, Leadership & People Impact

- **Ask:** Did you hire, train, mentor, or manage people? How many, and what changed under your leadership — retention, promotion rate, performance, engagement scores?
- **Dig deeper:** Did anyone you managed or trained get promoted, hit a record number, or outperform their peers?
- **Example flip:** "Managed a small team" → "Built and led a 7-person team from scratch, with 4 direct reports promoted within 18 months and team attrition at 0%"

### H. Growth, Innovation & Firsts

- **Ask:** Did you launch something new — a product, a process, a market, a partnership? Were you the first person or team to do something at the company?
- **Dig deeper:** What exists now that didn't exist before this? What was the adoption number, growth rate, or scale it reached in year one?
- **Example flip:** "Helped launch a new product line" → "Co-launched a new product line that reached $800K in sales within its first two quarters — 20% of total category revenue"

### I. Recognition & Benchmarks

- **Ask:** Were you ranked, was your team ranked, awarded, or singled out — top performer, highest-rated, fastest, most improved?
- **Dig deeper:** Out of how many people/teams were you ranked? What percentile or number were you?
- **Example flip:** "Strong performer on the sales team" → "Ranked #2 of 45 reps company-wide for two consecutive quarters"

## Section 3: Role-to-Category Mapping

Use this to decide which categories to surface first for a given title, so the candidate isn't asked irrelevant questions.

| Role type                                   | Lead with                                                | Also check                                     |
| ------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------- |
| Sales / Business Development                | A (Revenue), F (Retention), I (Recognition)              | C (Scope), E (Speed)                           |
| Marketing                                   | A (Revenue), H (Growth), D (Quality/metrics)             | C (Scope), E (Speed)                           |
| Operations / Supply Chain                   | B (Cost Savings), E (Speed), C (Scale)                   | D (Quality)                                    |
| Customer Success / Support                  | F (Retention), D (Quality/CSAT), B (Efficiency)          | G (Team, if leading a team)                    |
| Engineering / Product / Technical           | D (Quality/uptime), E (Speed), C (Scale)                 | H (Innovation), B (Efficiency)                 |
| Finance / Accounting                        | B (Cost Savings), C (Scale/budget size), D (Accuracy)    | A (Revenue, if FP&A)                           |
| HR / People / Recruiting                    | G (Team/People), E (Speed, time-to-hire), F (Retention)  | B (Efficiency)                                 |
| People Managers / Directors+ (any function) | G (Team), C (Scale/budget), A or B depending on function | I (Recognition)                                |
| Individual Contributor, early career        | D (Quality), E (Speed), I (Recognition)                  | C (Scope, even if small — frame relative size) |

If the resume parser can't confidently classify a title, default to asking one question from A, B, C, and D, then branch based on what the candidate's answers suggest.

## Section 4: The Vague → Quantified Conversion Pattern

Every raw answer should get checked against this pattern before being saved as a final bullet:

`[Action verb] + [what you did] + [quantified result] + [context/timeframe, if it strengthens it]`

| If the candidate says...              | Prompt them with...                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| "I helped improve X"                  | "How much did it improve — a percentage, or a before/after number?"               |
| "I managed a big team/budget/project" | "How big, exactly — headcount, dollar amount, or number of units/accounts?"       |
| "I made things run more smoothly"     | "What used to take longer or cost more, and what's the number now vs. before?"    |
| "I was really good at my job"         | "Were you ever ranked, rated, or compared to peers? Do you know where you stood?" |
| "It's hard to put a number on it"     | "If you had to guess — even roughly — what would you estimate? A range is fine."  |

## Section 5: Reconstruction Path (for "I don't have any numbers")

Some candidates genuinely don't know a metric off the top of their head. Rather than let the bullet stay unquantified, walk through this sequence:

1. **Frequency:** "How often did this task/activity happen — daily, weekly, per project?"
2. **Volume:** "How many people, dollars, accounts, or units did it touch each time?"
3. **Duration:** "How long were you doing this — months, years?"
4. **Multiply it out:** Combine 1–3 into an estimate ("If you saved 2 hours a week for 18 months, that's roughly 150 hours — what would that be worth at your team's hourly rate?")
5. **Comparative framing (last resort):** If a true number is unreachable, use relative language instead of inventing a false one: "one of the top performers on a 12-person team," "the only person handling X," "faster than the previous two hires combined." This is honest, still specific, and still far stronger than "responsible for."

## Section 6: Tone & UX Notes for Implementation

- Never ask more than one question at a time — this is a conversation, not a form.
- Show the "example flip" **after** the candidate's first attempt, not before — otherwise people just imitate the example instead of recalling their own experience.
- Allow "skip" on any question. Forcing an answer produces fabricated numbers, which is worse than no number.
- Close each role with a quick recap: "Here's what we pulled out for [Role] — anything missing?" This catches the "oh wait, actually..." memory that often surfaces only after seeing it written down.
