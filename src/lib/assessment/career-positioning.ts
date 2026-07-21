/**
 * Career Positioning Assessment — free public lead-gen quiz.
 *
 * Framework-free port of the questions + scoring from
 * `docs/prototypes/career-positioning-assessment (1).html`. Kept separate from
 * the authenticated CI-Blueprint engine in this directory — different product
 * surface, different audience.
 */

export type CategoryKey =
  | "brand"
  | "market"
  | "mindset"
  | "network"
  | "interview"
  | "worth";

export const CATS: Record<CategoryKey, { label: string }> = {
  brand: { label: "Personal Brand" },
  market: { label: "Market Positioning" },
  mindset: { label: "Mindset & Momentum" },
  network: { label: "Networking" },
  interview: { label: "Interview Readiness" },
  worth: { label: "Know Your Worth" },
};

interface ScaleQuestion {
  id: number;
  cat: CategoryKey;
  type: "scale";
  text: string;
  low: string;
  high: string;
}

interface McQuestion {
  id: number;
  cat: CategoryKey;
  type: "mc";
  text: string;
  options: { label: string; val: number }[];
}

export type Question = ScaleQuestion | McQuestion;

export const QUESTIONS: Question[] = [
  {
    id: 1,
    cat: "brand",
    type: "scale",
    text: "How confident are you that your resume clearly shows your biggest professional wins?",
    low: "Not confident",
    high: "Very confident",
  },
  {
    id: 2,
    cat: "brand",
    type: "mc",
    text: "When someone looks at your LinkedIn profile, how well does it represent your value?",
    options: [
      { label: "It's outdated or incomplete", val: 1 },
      { label: "It's decent but generic", val: 2 },
      { label: "It's solid but could be sharper", val: 3 },
      { label: "It's strong and gets attention", val: 4 },
    ],
  },
  {
    id: 3,
    cat: "brand",
    type: "mc",
    text: "Can you describe what makes you different from other candidates in one sentence?",
    options: [
      { label: "Not really — I haven't thought about it", val: 1 },
      { label: "I have an idea but haven't put it into words", val: 2 },
      { label: "Yes, but I don't use it consistently", val: 3 },
      { label: "Yes, and I use it in every conversation", val: 4 },
    ],
  },
  {
    id: 4,
    cat: "market",
    type: "scale",
    text: "How confident are you that your target role or industry will still be in demand 2–3 years from now?",
    low: "Not confident",
    high: "Very confident",
  },
  {
    id: 5,
    cat: "market",
    type: "mc",
    text: "Have you researched how AI or automation might affect your specific role?",
    options: [
      { label: "No, haven't thought about it", val: 1 },
      { label: "I've heard general news but nothing specific to me", val: 2 },
      { label: "I've looked into it a bit", val: 3 },
      { label: "Yes, and I've adjusted my strategy because of it", val: 4 },
    ],
  },
  {
    id: 6,
    cat: "market",
    type: "mc",
    text: "Is your current job search targeting roles similar to your past jobs, or roles that reflect where the market is heading?",
    options: [
      { label: "Mostly the same type of role I've always had", val: 1 },
      { label: "A mix", val: 2 },
      { label: "Mostly forward-looking roles", val: 4 },
      { label: "Not sure how to tell the difference", val: 2 },
    ],
  },
  {
    id: 7,
    cat: "mindset",
    type: "scale",
    text: "How would you describe your energy level around your job search right now?",
    low: "Exhausted / discouraged",
    high: "Motivated & clear-headed",
  },
  {
    id: 8,
    cat: "mindset",
    type: "mc",
    text: "How often do you find yourself avoiding job search tasks (applications, networking, etc.)?",
    options: [
      { label: "Almost daily", val: 1 },
      { label: "A few times a week", val: 2 },
      { label: "Occasionally", val: 3 },
      { label: "Rarely", val: 4 },
    ],
  },
  {
    id: 9,
    cat: "mindset",
    type: "mc",
    text: "Do you have a consistent weekly plan for your search, or does it happen in bursts?",
    options: [
      { label: "No real plan — it's random", val: 1 },
      { label: "Loose plan, inconsistent", val: 2 },
      { label: "Mostly consistent", val: 3 },
      { label: "Yes, structured and consistent", val: 4 },
    ],
  },
  {
    id: 10,
    cat: "network",
    type: "mc",
    text: "In the past month, how many new professional conversations (calls, coffee chats, LinkedIn messages) have you had?",
    options: [
      { label: "0", val: 1 },
      { label: "1–2", val: 2 },
      { label: "3–5", val: 3 },
      { label: "6+", val: 4 },
    ],
  },
  {
    id: 11,
    cat: "network",
    type: "scale",
    text: "How comfortable are you reaching out to someone you don't know for an informational conversation?",
    low: "Very uncomfortable",
    high: "Very comfortable",
  },
  {
    id: 12,
    cat: "network",
    type: "mc",
    text: "Do you have a system for following up and staying in touch with your network?",
    options: [
      { label: "No system at all", val: 1 },
      { label: "I follow up when I remember", val: 2 },
      { label: "Somewhat consistent", val: 3 },
      { label: "Yes, I track and follow up regularly", val: 4 },
    ],
  },
  {
    id: 13,
    cat: "interview",
    type: "scale",
    text: "How confident are you answering “Tell me about yourself” in a way that's tight and compelling?",
    low: "Not confident",
    high: "Very confident",
  },
  {
    id: 14,
    cat: "interview",
    type: "mc",
    text: "When you talk about your accomplishments, do you use specific numbers or metrics?",
    options: [
      { label: "Rarely — I speak in general terms", val: 1 },
      { label: "Sometimes", val: 2 },
      { label: "Usually", val: 3 },
      { label: "Always — I have numbers ready for every story", val: 4 },
    ],
  },
  {
    id: 15,
    cat: "interview",
    type: "mc",
    text: "How many mock interviews or practice sessions have you done in the last 3 months?",
    options: [
      { label: "0", val: 1 },
      { label: "1–2", val: 2 },
      { label: "3–5", val: 3 },
      { label: "6+", val: 4 },
    ],
  },
  {
    id: 16,
    cat: "worth",
    type: "scale",
    text: "How confident are you that you know your accurate market value for your target role?",
    low: "Not confident",
    high: "Very confident",
  },
  {
    id: 17,
    cat: "worth",
    type: "mc",
    text: "Have you ever negotiated a job offer?",
    options: [
      { label: "No, never", val: 1 },
      { label: "Tried once but backed down", val: 2 },
      { label: "Yes, negotiated but unsure if I got the best outcome", val: 3 },
      { label: "Yes, confidently and successfully", val: 4 },
    ],
  },
  {
    id: 18,
    cat: "worth",
    type: "scale",
    text: "If you got an offer next week, how prepared do you feel to negotiate it?",
    low: "Not prepared",
    high: "Very prepared",
  },
];

export interface Tier {
  name: string;
  headline: string;
  copy: string;
  cta: string;
}

/** The blob persisted to `leads.assessment_result` (jsonb). */
export interface CareerAssessmentResult {
  overallPct: number;
  tier: Tier;
  categoryPct: Record<CategoryKey, number>;
  lowestCategory: CategoryKey;
  answers: Record<number, number>;
}

/**
 * Score a full set of answers (question id → chosen value). Mirrors the
 * prototype's `computeResults` exactly.
 */
export function computeResults(
  answers: Record<number, number>
): CareerAssessmentResult {
  const catPoints = {} as Record<CategoryKey, number>;
  const catMax = {} as Record<CategoryKey, number>;
  (Object.keys(CATS) as CategoryKey[]).forEach((k) => {
    catPoints[k] = 0;
    catMax[k] = 0;
  });

  QUESTIONS.forEach((q) => {
    const max = q.type === "scale" ? 5 : 4;
    catMax[q.cat] += max;
    catPoints[q.cat] += answers[q.id] || 0;
  });

  let totalPoints = 0;
  let totalMax = 0;
  const categoryPct = {} as Record<CategoryKey, number>;
  (Object.keys(CATS) as CategoryKey[]).forEach((k) => {
    totalPoints += catPoints[k];
    totalMax += catMax[k];
    categoryPct[k] = Math.round((100 * catPoints[k]) / catMax[k]);
  });

  const overallPct = Math.round((100 * totalPoints) / totalMax);

  const lowestCategory = (Object.keys(CATS) as CategoryKey[]).reduce((a, b) =>
    categoryPct[a] <= categoryPct[b] ? a : b
  );

  let tier: Tier;
  if (overallPct <= 45) {
    tier = {
      name: "Search Reset Needed",
      headline:
        "Your search has real potential — it just needs a stronger foundation.",
      copy: "Your results show clear opportunities to strengthen your brand, positioning, and strategy before you keep spending energy applying. Every one of these is fixable, and most candidates in this range see a real shift within a few weeks of focused work.",
      cta: "Book your free strategy call to build a plan",
    };
  } else if (overallPct <= 72) {
    tier = {
      name: "Building Momentum",
      headline:
        "You're on the right track — a few targeted fixes will accelerate things fast.",
      copy: `You've got real strengths to work with, but a few specific gaps are holding back your results — especially in ${CATS[lowestCategory].label}. Closing gaps like this is usually where we see the biggest jump in interview activity.`,
      cta: "Book your free strategy call to pinpoint your gaps",
    };
  } else {
    tier = {
      name: "Market Ready",
      headline:
        "You're close. Let's make sure you land the right offer — not just an offer.",
      copy: "You're already doing a lot right. At this stage, the biggest lever left is usually negotiation and market positioning — making sure you're not leaving money or the ideal role on the table.",
      cta: "Book your free strategy call to talk offer strategy",
    };
  }

  return { overallPct, tier, categoryPct, lowestCategory, answers };
}
