/**
 * Role Clarity — 18 questions across 6 sections, scored by option index.
 *
 * Ported from the Claude artifact prototype (02603df4-8125-47c5-b2e9-03b279569c56).
 * The prototype's published viewer exposes no source, so question text, option
 * labels, result copy, and the scoring model were recovered by running it and
 * verifying the arithmetic against four measured totals — see
 * docs/role-clarity-spec.md. `role-clarity.check.ts` pins all four.
 *
 * Scoring is deliberately dumber than the Blueprint's: no axis weights, no
 * archetype. Every question scores its 1-based option index, so each section is
 * one 1–5 Likert plus two 1–4 choices = 13, and the whole thing is 78.
 */

export const ROLE_CLARITY_MAX = 78;
export const ROLE_CLARITY_MIN = 18;
export const SECTION_MAX = 13;

export type SectionKey =
  | "title"
  | "scope"
  | "company"
  | "industry"
  | "leadership"
  | "market";

export interface Section {
  key: SectionKey;
  title: string;
  /** Shown per-section on the results page, and inside the weakest-section callout. */
  tip: string;
}

/** Order is load-bearing: it breaks ties when picking the weakest section. */
export const SECTION_ORDER: SectionKey[] = [
  "title",
  "scope",
  "company",
  "industry",
  "leadership",
  "market",
];

export const SECTIONS: Record<SectionKey, Section> = {
  title: {
    key: "title",
    title: "Title & Positioning Clarity",
    tip: "Draft a one-sentence positioning statement that names your actual scope, not just your title — and test it in your next 3 conversations.",
  },
  scope: {
    key: "scope",
    title: "Scope & Impact",
    tip: "Go back through your last two roles and attach one hard number to each accomplishment. Even a rough estimate beats a vague description.",
  },
  company: {
    key: "company",
    title: "Company Size & Culture Fit",
    tip: "List the two company sizes where you've done your best work, and filter your next 10 applications down to just those.",
  },
  industry: {
    key: "industry",
    title: "Industry & Transferability",
    tip: "Write down which 3 of your skills would survive a move to a completely different industry — those are your safest pivot points.",
  },
  leadership: {
    key: "leadership",
    title: "Leadership Trajectory",
    tip: "Decide, on paper, whether you want to manage people again before your next role — don't let the next offer decide it for you.",
  },
  market: {
    key: "market",
    title: "Market Direction & Demand Awareness",
    tip: "Spend 20 minutes this week reading 5 current postings for your target title and note what's different from postings two years ago.",
  },
};

interface LikertQuestion {
  section: SectionKey;
  kind: "likert";
  text: string;
  /** Endpoint captions for the 1–5 scale. */
  low: string;
  high: string;
}

interface ChoiceQuestion {
  section: SectionKey;
  kind: "choice";
  text: string;
  /** Exactly 4, ordered weakest → strongest. Index + 1 is the score. */
  options: string[];
}

export type RoleClarityQuestion = LikertQuestion | ChoiceQuestion;

export const QUESTIONS: RoleClarityQuestion[] = [
  // ──────────────────────────── Title & Positioning Clarity (1–3)
  {
    section: "title",
    kind: "likert",
    text: "How confident are you that the job title on your resume matches the actual seniority and scope of what you've done?",
    low: "Not confident",
    high: "Very confident",
  },
  {
    section: "title",
    kind: "choice",
    text: "When you describe your role to a recruiter, does your explanation match what you actually did, or just what your title says?",
    options: [
      "I mostly repeat my title, not what I actually did",
      "I get vague and lose the recruiter's attention",
      "I describe my real scope but stumble over the right title for it",
      "I have a tight explanation that pairs the right title with clear scope",
    ],
  },
  {
    section: "title",
    kind: "choice",
    text: "Do you know the 2-3 job titles you should actually be applying under right now?",
    options: [
      "No — I'm applying to whatever looks close enough",
      "I have a guess but haven't verified it against anything",
      "I have one solid title but haven't explored the alternates",
      "Yes — I know exactly which titles fit and why",
    ],
  },

  // ──────────────────────────── Scope & Impact (4–6)
  {
    section: "scope",
    kind: "likert",
    text: "How easily can you quantify your biggest professional impact — dollars, percentages, team size, users, time saved?",
    low: "Can't quantify it",
    high: "Have numbers ready",
  },
  {
    section: "scope",
    kind: "choice",
    text: "Which best describes the work you're most proud of?",
    options: [
      "I maintained or operated something that already existed",
      "I improved an existing process or system",
      "I built something new, but with a clear spec and a lot of guidance",
      "I built something new starting from an ambiguous, open-ended problem",
    ],
  },
  {
    section: "scope",
    kind: "choice",
    text: "How much decision authority did you actually have in your last role?",
    options: [
      "I only executed what I was told to do",
      "I could recommend a direction but not decide",
      "I could decide within a defined scope or budget",
      "I owned the budget, roadmap, or decision outright",
    ],
  },

  // ──────────────────────────── Company Size & Culture Fit (7–9)
  {
    section: "company",
    kind: "likert",
    text: "How clear are you on which company size or stage — startup, growth-stage, enterprise — you do your best work at?",
    low: "No idea",
    high: "Very clear",
  },
  {
    // ponytail: this is a stage *preference*, not a clarity measure, but the
    // prototype scores it ordinally (enterprise = 4, startup = 1) and every
    // verified fixture depends on that. Kept as-is on purpose; changing it is a
    // content decision, not a code fix. See docs/role-clarity-spec.md.
    section: "company",
    kind: "choice",
    text: "Thinking back to your best role, what best describes that environment?",
    options: [
      "Small team, high ambiguity, very few defined processes",
      "Growing company — some process in place, but still flexible",
      "Established company with clear process and structure",
      "Large enterprise — defined roles and formal approval chains",
    ],
  },
  {
    section: "company",
    kind: "choice",
    text: "Where is your current search actually focused?",
    options: [
      "Applying broadly, regardless of company size",
      "Leaning toward whatever's similar to my last job, without really deciding",
      "I've picked a target size but haven't tested whether it's right",
      "I've deliberately chosen a size and stage based on what's actually worked for me",
    ],
  },

  // ──────────────────────────── Industry & Transferability (10–12)
  {
    section: "industry",
    kind: "choice",
    text: "How many distinct industries have you worked in?",
    options: ["Not sure how to count it", "0-1", "2-3", "4 or more"],
  },
  {
    section: "industry",
    kind: "likert",
    text: "How confident are you that you know which of your skills transfer across industries, and which are industry-specific?",
    low: "Not confident",
    high: "Very confident",
  },
  {
    section: "industry",
    kind: "choice",
    text: "Is your search targeting the same industry as your last role, or exploring new ones?",
    options: [
      "Same industry only — I haven't considered alternatives",
      "Mostly the same, open to a couple of others",
      "Actively exploring 2-3 adjacent industries",
      "I know exactly which industries fit and why",
    ],
  },

  // ──────────────────────────── Leadership Trajectory (13–15)
  {
    section: "leadership",
    kind: "likert",
    text: "How clear are you on whether you want to be an individual contributor, a player-coach, or a full-time people manager next?",
    low: "Not clear at all",
    high: "Completely clear",
  },
  {
    section: "leadership",
    kind: "choice",
    text: "How do you feel about managing people day to day?",
    options: [
      "I've never managed and don't know if I'd want to",
      "I've managed before and it drained me",
      "I've managed before — it's fine, not a strong pull either way",
      "I've managed before and genuinely want more of it",
    ],
  },
  {
    section: "leadership",
    kind: "choice",
    text: "In your last role, how often did you mentor, train, or informally lead others without it being your official job?",
    options: [
      "Never",
      "Occasionally",
      "Regularly",
      "It was basically my unofficial job",
    ],
  },

  // ──────────────────────────── Market Direction & Demand Awareness (16–18)
  {
    section: "market",
    kind: "likert",
    text: "How confident are you that the role or title you're targeting will still be in demand 2-3 years from now?",
    low: "Not confident",
    high: "Very confident",
  },
  {
    section: "market",
    kind: "choice",
    text: "Have you researched how your target role is actually changing right now — skills rising or falling, titles shifting?",
    options: [
      "No",
      "I've seen general headlines, nothing specific to my role",
      "I've looked into my specific role a bit",
      "Yes, and I've adjusted my target titles or skills because of it",
    ],
  },
  {
    // Bug fix vs the prototype: it listed "Not sure how to tell the difference"
    // last, so the weakest answer scored 4 — the only way to reach 78/78 was to
    // admit you couldn't tell. Moved to index 0 where it belongs.
    section: "market",
    kind: "choice",
    text: "Are your target titles aimed at where the market is right now, or where it's actually heading?",
    options: [
      "Not sure how to tell the difference",
      "I'm targeting the same type of role I've always had",
      "A mix",
      "Mostly forward-looking titles",
    ],
  },
];

// ────────────────────────────────────────────────────────────
// Bands
// ────────────────────────────────────────────────────────────

export type BandKey = "searching" | "warmer" | "dialed";

export interface Band {
  key: BandKey;
  /** Inclusive lower bound on the raw 18–78 score. */
  min: number;
  label: string;
  headline: string;
  body: string;
  /** Framing above the prescribed product on the results page. */
  ctaHeading: string;
}

/**
 * ponytail: the prototype's exact cut points aren't recoverable from rendered
 * output — replays only bracket them (band 1→2 in (18, 36], band 2→3 in
 * (52, 77]). 31 and 60 sit inside both brackets and are consistent with every
 * observation. Tune if the real thresholds ever surface.
 */
export const BANDS: Band[] = [
  {
    key: "dialed",
    min: 60,
    label: "Dialed in & ready to target",
    headline: "You know your lane. Let's make sure the market agrees.",
    body: "You've already done the hard part of figuring out where you fit. At this stage, the highest-leverage move is usually pressure-testing that target against real postings.",
    ctaHeading: "Pressure-test your target",
  },
  {
    key: "warmer",
    min: 31,
    label: "Getting warmer",
    headline:
      "You're closer than it feels — a few specific gaps are keeping your search fuzzy.",
    body: "You've got a real sense of direction, but there are specific gaps keeping you from applying with full confidence. Closing these is usually where we see candidates start applying faster and hearing back more.",
    ctaHeading: "Pinpoint your target",
  },
  {
    key: "searching",
    min: 0,
    label: "Still searching for your lane",
    headline:
      "You've got real experience — it's just not translated into a clear target yet.",
    body: "Right now your search is likely spread across too many directions, or anchored to a title that undersells or oversells what you've actually done. That's completely fixable, and it's usually the fastest-moving fix we make.",
    ctaHeading: "Nail down your target",
  },
];

export function bandFor(overall: number): Band {
  // BANDS is ordered high → low, so the first match is the right one.
  return BANDS.find((b) => overall >= b.min) ?? BANDS[BANDS.length - 1];
}

// ────────────────────────────────────────────────────────────
// Scoring
// ────────────────────────────────────────────────────────────

/** questionIndex (0–17) → optionIndex (0-based; 0–4 for likert, 0–3 for choice) */
export type RoleClarityAnswers = Record<number, number>;

export interface RoleClarityResult {
  /** Raw section totals, each out of SECTION_MAX. */
  sections: Record<SectionKey, number>;
  /** Raw total, 18–78. */
  overall: number;
  /** Normalised 0–100 for candidate_scores.role_clarity_score. */
  normalised: number;
  band: Band;
  /** Lowest-scoring section; ties break on SECTION_ORDER. */
  weakest: SectionKey;
}

/** Option count for a question — the max score it can contribute. */
export function optionCount(q: RoleClarityQuestion): number {
  return q.kind === "likert" ? 5 : q.options.length;
}

/**
 * Raw 18–78 → 0–100. Min-max, not `overall / 78`: the floor is 18, so dividing
 * by the max would report a floor answer as 23/100 and an all-middle answer as
 * 67 — above the WEAK cutoff in dashboard/prescribe.ts, which is wrong. Min-max
 * puts all-middle at 57, which correctly reads as a gap worth acting on.
 */
export function normalise(overall: number): number {
  return Math.round(
    ((overall - ROLE_CLARITY_MIN) / (ROLE_CLARITY_MAX - ROLE_CLARITY_MIN)) * 100
  );
}

export function scoreRoleClarity(
  answers: RoleClarityAnswers
): RoleClarityResult {
  const sections: Record<SectionKey, number> = {
    title: 0,
    scope: 0,
    company: 0,
    industry: 0,
    leadership: 0,
    market: 0,
  };

  QUESTIONS.forEach((q, i) => {
    // Every question scores its 1-based option index. Unanswered counts as the
    // floor rather than throwing — the server action validates completeness.
    sections[q.section] += (answers[i] ?? 0) + 1;
  });

  const overall = SECTION_ORDER.reduce((sum, k) => sum + sections[k], 0);

  let weakest: SectionKey = SECTION_ORDER[0];
  for (const key of SECTION_ORDER) {
    if (sections[key] < sections[weakest]) weakest = key;
  }

  return {
    sections,
    overall,
    normalised: normalise(overall),
    band: bandFor(overall),
    weakest,
  };
}
