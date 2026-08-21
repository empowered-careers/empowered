/**
 * Big Wins — question bank, role→category routing, and the overlay merge.
 *
 * Spec: docs/big_wins_q&a.md. Plan: docs/big-wins-implementation-plan.md.
 *
 * All content here is static: the ask, the dig-deeper follow-up, the example
 * flip, the Section 4 vagueness prompts, and the Section 5 reconstruction
 * sequence. The only LLM call in the feature is the per-role polish pass in
 * src/lib/llm/polish-wins.ts.
 */

import type { WorkExperience } from "@/lib/llm/schemas";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export type BigWinsCategoryKey =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I";

export interface BigWinsCategory {
  key: BigWinsCategoryKey;
  /** Short label for progress chrome. */
  label: string;
  /** The question shown to the candidate. */
  ask: string;
  /** Follow-up shown on request, or when the first answer is thin. */
  dig: string;
  /** Vague → quantified reference pair. Shown AFTER a first attempt. */
  flip: { before: string; after: string };
}

/** `"<company>|<title>"`, normalised. Stable across resume re-uploads. */
export type RoleKey = string;

/** Raw candidate answers: role key → category key → free text. */
export type BigWinsAnswers = Record<
  RoleKey,
  Partial<Record<BigWinsCategoryKey, string>>
>;

/** A role the candidate can run Big Wins against, lifted from parsed_json. */
export interface BigWinsRole {
  key: RoleKey;
  company: string;
  title: string;
  start: string | null;
  end: string | null;
  /** Bullets the parser lifted verbatim — the "before" half of before/after. */
  originalBullets: string[];
}

export interface BigWinsRoleResult {
  bullets: string[];
  polished_at: string;
}

/** Persisted to assessment_responses.result. */
export interface BigWinsResult {
  roles: Record<RoleKey, BigWinsRoleResult>;
}

/** A role with the overlay applied, ready to render. */
export interface MergedRole extends BigWinsRole {
  bullets: string[];
  rewritten: boolean;
  /** True when the overlay has a role the current resume no longer lists. */
  orphaned: boolean;
}

// ────────────────────────────────────────────────────────────
// Section 1 — opening frame
// ────────────────────────────────────────────────────────────

export const OPENING_FRAME =
  "We're going to go role by role and pull out the impact behind what you did — not just your responsibilities. Most people undersell themselves here, not because the work wasn't impressive, but because they never had to put a number on it before. If you don't remember an exact figure, a solid estimate is completely fine — just say “roughly” or “about.”";

// ────────────────────────────────────────────────────────────
// Section 2 — master Q&A bank
// ────────────────────────────────────────────────────────────

export const CATEGORIES: Record<BigWinsCategoryKey, BigWinsCategory> = {
  A: {
    key: "A",
    label: "Revenue & Sales Impact",
    ask: "Did anything you did directly generate, protect, or influence revenue? How much, and over what time period?",
    dig: "Even indirectly — did your work help close deals, retain accounts, expand a book of business, or unlock new markets? What was the deal size, account value, or market size?",
    flip: {
      before: "Worked with sales team on client accounts",
      after:
        "Supported a $2.4M portfolio of 18 enterprise accounts, contributing to a 15% year-over-year growth in renewals",
    },
  },
  B: {
    key: "B",
    label: "Cost Savings & Efficiency",
    ask: "Did you reduce spend, cut waste, eliminate a manual process, or make something faster/cheaper? What was the before-and-after?",
    dig: "Think about time saved per task multiplied by how often that task happened. Even “saved 3 hours a week” becomes real when you multiply it across a team and a year.",
    flip: {
      before: "Improved the invoicing process",
      after:
        "Automated the invoicing workflow, cutting processing time from 5 days to 1 and saving an estimated $40K/year in labor hours",
    },
  },
  C: {
    key: "C",
    label: "Scale, Scope & Size",
    ask: "How big was what you managed — budget, team size, number of accounts, users, locations, SKUs, transactions, or geographic reach?",
    dig: "What's the largest single project, launch, or initiative you owned end-to-end? How would you describe its size to an investor?",
    flip: {
      before: "Managed a project",
      after:
        "Led a $1.2M platform migration across 6 regional offices and 140 end users with zero downtime",
    },
  },
  D: {
    key: "D",
    label: "Quality & Performance",
    ask: "Did you improve accuracy, reduce errors/defects, hit or beat a performance target, or improve a score (CSAT, NPS, SLA compliance, uptime)?",
    dig: "Was there a “before” state that was a known pain point? What was it measured at before you touched it, and after?",
    flip: {
      before: "Responsible for QA on releases",
      after:
        "Reduced post-release defect rate by 32% over two quarters by redesigning the QA checklist and catching issues pre-launch",
    },
  },
  E: {
    key: "E",
    label: "Speed & Time-to-Value",
    ask: "Did you make something happen faster — a launch, a hire, a turnaround time, an approval cycle, a delivery timeline?",
    dig: "Compare the old timeline to the new one. Even “we used to take 2 weeks, now it's 3 days” is a strong, concrete stat.",
    flip: {
      before: "Streamlined onboarding",
      after:
        "Cut new-hire onboarding time from 3 weeks to 5 days, accelerating time-to-productivity by 70%",
    },
  },
  F: {
    key: "F",
    label: "Retention & Loyalty",
    ask: "Did your work help keep customers, employees, members, or clients from leaving? What was the retention rate, churn reduction, or renewal rate?",
    dig: "Think about who was at risk of leaving before you got involved, and what changed after.",
    flip: {
      before: "Improved customer support",
      after:
        "Reduced customer churn by 12% by rebuilding the support escalation process, protecting roughly $500K in annual recurring revenue",
    },
  },
  G: {
    key: "G",
    label: "Team & Leadership",
    ask: "Did you hire, train, mentor, or manage people? How many, and what changed under your leadership — retention, promotion rate, performance, engagement?",
    dig: "Did anyone you managed or trained get promoted, hit a record number, or outperform their peers?",
    flip: {
      before: "Managed a small team",
      after:
        "Built and led a 7-person team from scratch, with 4 direct reports promoted within 18 months and team attrition at 0%",
    },
  },
  H: {
    key: "H",
    label: "Growth, Innovation & Firsts",
    ask: "Did you launch something new — a product, a process, a market, a partnership? Were you the first person or team to do something at the company?",
    dig: "What exists now that didn't exist before this? What was the adoption number, growth rate, or scale it reached in year one?",
    flip: {
      before: "Helped launch a new product line",
      after:
        "Co-launched a new product line that reached $800K in sales within its first two quarters — 20% of total category revenue",
    },
  },
  I: {
    key: "I",
    label: "Recognition & Benchmarks",
    ask: "Were you ranked, was your team ranked, awarded, or singled out — top performer, highest-rated, fastest, most improved?",
    dig: "Out of how many people or teams were you ranked? What percentile or number were you?",
    flip: {
      before: "Strong performer on the sales team",
      after: "Ranked #2 of 45 reps company-wide for two consecutive quarters",
    },
  },
};

export const CATEGORY_ORDER: BigWinsCategoryKey[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
];

// ────────────────────────────────────────────────────────────
// Section 3 — role → category routing
// ────────────────────────────────────────────────────────────

type RoleFunction =
  | "sales"
  | "marketing"
  | "operations"
  | "customer_success"
  | "engineering"
  | "finance"
  | "hr"
  | "early_ic";

interface CategoryRoute {
  lead: BigWinsCategoryKey[];
  also: BigWinsCategoryKey[];
}

const FUNCTION_ROUTES: Record<RoleFunction, CategoryRoute> = {
  sales: { lead: ["A", "F", "I"], also: ["C", "E"] },
  marketing: { lead: ["A", "H", "D"], also: ["C", "E"] },
  operations: { lead: ["B", "E", "C"], also: ["D"] },
  customer_success: { lead: ["F", "D", "B"], also: ["G"] },
  engineering: { lead: ["D", "E", "C"], also: ["H", "B"] },
  finance: { lead: ["B", "C", "D"], also: ["A"] },
  hr: { lead: ["G", "E", "F"], also: ["B"] },
  early_ic: { lead: ["D", "E", "I"], also: ["C"] },
};

/** Spec default when the title can't be classified. */
const DEFAULT_ROUTE: CategoryRoute = { lead: ["A", "B", "C"], also: ["D"] };

// ponytail: keyword title match, not an LLM classify call. Swap in a model call
// if real usage shows titles routing to the wrong categories.
const FUNCTION_KEYWORDS: [RoleFunction, RegExp][] = [
  [
    "customer_success",
    /customer success|client success|account manag|customer support|support (lead|manager|engineer|specialist)|csm\b|technical support/i,
  ],
  [
    "sales",
    /\bsales\b|business development|\bbd\b|account executive|\bae\b|revenue|partnerships?|quota/i,
  ],
  [
    "marketing",
    /marketing|brand|demand gen|growth (lead|manager|marketer)|content (strategist|marketer)|\bseo\b|communications|\bpr\b/i,
  ],
  [
    "engineering",
    /engineer|developer|programmer|architect|\bsre\b|devops|data scien|\bml\b|machine learning|product manager|\bqa\b|technical lead|\bcto\b|\bswe\b/i,
  ],
  [
    "finance",
    /financ|account(ant|ing)|controller|\bfp&a\b|treasur|audit|\bcfo\b|bookkeep|tax\b/i,
  ],
  [
    "hr",
    /human resources|\bhr\b|people (ops|partner|manager)|recruit|talent acquisition|\bchro\b|\bl&d\b|learning and development/i,
  ],
  [
    "operations",
    /operations|\bops\b|supply chain|logistics|procurement|warehouse|manufactur|program manager|\bcoo\b|fulfilment|fulfillment/i,
  ],
];

const SENIOR_LEADER =
  /manager|director|\bvp\b|vice president|head of|chief|\bc[eiofot]o\b|partner\b|principal|president/i;

const EARLY_CAREER =
  /\b(junior|jr\.?|intern|trainee|entry[- ]level|associate|assistant|apprentice|graduate|analyst i{1,2})\b/i;

/**
 * Which categories to ask for a given job title, per the Section 3 table.
 *
 * `initial` is the 4–6 questions surfaced up front; `more` is everything else,
 * revealed only if the candidate asks for it.
 */
export function categoriesForTitle(title: string): {
  initial: BigWinsCategoryKey[];
  more: BigWinsCategoryKey[];
} {
  const fn = FUNCTION_KEYWORDS.find(([, re]) => re.test(title))?.[0];
  const senior = SENIOR_LEADER.test(title);
  const early = !senior && EARLY_CAREER.test(title);

  let route: CategoryRoute;
  if (early) {
    route = FUNCTION_ROUTES.early_ic;
  } else if (senior) {
    // "People Managers / Directors+ (any function)": lead with G (Team) and
    // C (Scale), then the function's own top category. I (Recognition) after.
    const fnRoute = fn ? FUNCTION_ROUTES[fn] : DEFAULT_ROUTE;
    route = {
      lead: ["G", "C", fnRoute.lead[0]],
      also: ["I"],
    };
  } else {
    route = fn ? FUNCTION_ROUTES[fn] : DEFAULT_ROUTE;
  }

  const initial = dedupe([...route.lead, ...route.also]);
  const more = CATEGORY_ORDER.filter((k) => !initial.includes(k));
  return { initial, more };
}

function dedupe(keys: BigWinsCategoryKey[]): BigWinsCategoryKey[] {
  return [...new Set(keys)];
}

// ────────────────────────────────────────────────────────────
// Section 4 — vague → quantified nudges
// ────────────────────────────────────────────────────────────

export const BULLET_PATTERN =
  "[Action verb] + [what you did] + [quantified result] + [context/timeframe, if it strengthens it]";

const VAGUENESS_TRIGGERS: [RegExp, string][] = [
  [
    /\bhelped\b|\bimproved\b|\bcontributed\b|\bassisted\b|\bsupported\b/i,
    "How much did it improve — a percentage, or a before/after number?",
  ],
  [
    /\bbig\b|\blarge\b|\bmanaged a\b|\bled a\b|\bsmall\b|\bseveral\b|\bmultiple\b/i,
    "How big, exactly — headcount, dollar amount, or number of units/accounts?",
  ],
  [
    /smooth|efficien|streamlin|better|faster(?!\s+by)|optimi[sz]/i,
    "What used to take longer or cost more, and what's the number now vs. before?",
  ],
  [
    /\bgood at\b|\bstrong\b|\btop\b|\bbest\b|\bexcell/i,
    "Were you ever ranked, rated, or compared to peers? Do you know where you stood?",
  ],
  [
    /hard to (put|say|quantify)|no numbers?|don'?t (know|remember|have)|not sure|can'?t recall/i,
    "If you had to guess — even roughly — what would you estimate? A range is fine.",
  ],
];

/**
 * A Section 4 nudge for an answer that has no number in it, or null if the
 * answer already looks quantified.
 */
export function vaguenessNudge(answer: string): string | null {
  const text = answer.trim();
  if (!text) return null;
  if (hasNumber(text)) return null;
  const hit = VAGUENESS_TRIGGERS.find(([re]) => re.test(text));
  return (
    hit?.[1] ??
    "Is there a number attached to this — a percentage, a dollar figure, a headcount, or a before/after?"
  );
}

/** Digits, or spelled-out small numbers and magnitudes. */
export function hasNumber(text: string): boolean {
  return (
    /\d/.test(text) ||
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|dozen|hundred|thousand|million|billion|half|doubled?|tripled?|quadrupled?)\b/i.test(
      text
    )
  );
}

/**
 * Numeric claims in a generated bullet that don't trace back to what the
 * candidate said.
 *
 * BIG_WINS_SYSTEM_PROMPT calls "never invent a number" its one unbreakable
 * rule; this is the part that isn't on the honour system. Every figure in a
 * bullet must appear in `sources` (the candidate's answers, plus the bullets
 * already on their resume — the prompt allows reusing a figure they repeated).
 *
 * ponytail: token-presence, not arithmetic. The prompt permits a figure that
 * "follows arithmetically" from an answer ("5 days to 1" → "80% faster"), and
 * that derivation reads as unbacked here. Flagging is a prompt for the
 * candidate to confirm, never a deletion, so a false flag costs a glance. If
 * the rate turns out to be annoying, exempt derived percentages first.
 */
export function unbackedNumbers(bullet: string, sources: string[]): string[] {
  const haystack = sources.map(normalizeFigures).join("   ");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of bullet.match(FIGURE) ?? []) {
    const norm = normalizeFigures(raw);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    if (!haystack.includes(norm)) out.push(raw.trim());
  }
  return out;
}

/**
 * Figures a resume bullet can carry: percentages, currency amounts, k/m/b
 * magnitudes, Nx multipliers, and bare integers/decimals (which pick up
 * headcounts, day counts, and years).
 */
const FIGURE =
  /\d+(?:[,\u00a0\u202f ]\d{3})*(?:\.\d+)?\s?(?:[kKmMbB]\b|[xX]\b|%)?/g;

/**
 * Collapse a figure to a comparable core so "40K", "40,000", "$40k" and
 * "40 000" all land on the same string. Magnitude suffixes and their
 * spelled-out forms are expanded rather than stripped, so "40k" does not match
 * a bare "40".
 */
function normalizeFigures(text: string): string {
  return text
    .toLowerCase()
    .replace(/(\d)[,\u00a0\u202f ](?=\d{3}(?!\d))/g, "$1") // 40,000 / 40 000 → 40000
    .replace(/\b(\d+(?:\.\d+)?)\s?(k|thousand)\b/g, (_, n) =>
      String(Math.round(Number(n) * 1_000))
    )
    .replace(/\b(\d+(?:\.\d+)?)\s?(m|million)\b/g, (_, n) =>
      String(Math.round(Number(n) * 1_000_000))
    )
    .replace(/\b(\d+(?:\.\d+)?)\s?(b|billion)\b/g, (_, n) =>
      String(Math.round(Number(n) * 1_000_000_000))
    )
    .replace(/(\d)\.0+\b/g, "$1") // 15.0 → 15
    .replace(/\s+/g, " ")
    .trim();
}

// ────────────────────────────────────────────────────────────
// Section 5 — reconstruction path
// ────────────────────────────────────────────────────────────

export const RECONSTRUCTION_STEPS: { label: string; prompt: string }[] = [
  {
    label: "Frequency",
    prompt:
      "How often did this task or activity happen — daily, weekly, per project?",
  },
  {
    label: "Volume",
    prompt:
      "How many people, dollars, accounts, or units did it touch each time?",
  },
  {
    label: "Duration",
    prompt: "How long were you doing this — months, years?",
  },
  {
    label: "Multiply it out",
    prompt:
      "Put those together into an estimate. If you saved 2 hours a week for 18 months, that's roughly 150 hours — what would that be worth at your team's rate?",
  },
  {
    label: "Comparative framing",
    prompt:
      "If a real number is genuinely out of reach, use relative language instead of inventing one: “one of the top performers on a 12-person team,” “the only person handling X,” “faster than the previous two hires combined.”",
  },
];

// ────────────────────────────────────────────────────────────
// Role keys + the overlay merge
// ────────────────────────────────────────────────────────────

/**
 * Stable identity for a role. Keyed on company + title rather than array index
 * so a re-uploaded resume that reorders or drops roles doesn't scramble the
 * overlay.
 */
export function roleKey(company: string, title: string): RoleKey {
  return `${normalise(company)}|${normalise(title)}`;
}

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Lift the runnable role list out of a parsed resume. */
export function rolesFromParsed(
  workExperience: WorkExperience[]
): BigWinsRole[] {
  return workExperience.map((w) => ({
    key: roleKey(w.company, w.title),
    company: w.company,
    title: w.title,
    start: w.start,
    end: w.end,
    originalBullets: w.bullets,
  }));
}

/**
 * Apply a Big Wins result over the parsed resume's roles. Rewritten bullets win
 * where present; every other role keeps the parser's bullets untouched.
 *
 * Overlay entries with no matching role on the current resume are appended and
 * flagged `orphaned` — they came from a resume that has since been replaced, and
 * are surfaced rather than silently dropped.
 */
export function mergeRoleBullets(
  roles: BigWinsRole[],
  result: BigWinsResult | null
): MergedRole[] {
  const overlay = result?.roles ?? {};
  const merged: MergedRole[] = roles.map((role) => {
    const rewritten = overlay[role.key];
    return {
      ...role,
      bullets:
        rewritten && rewritten.bullets.length > 0
          ? rewritten.bullets
          : role.originalBullets,
      rewritten: !!rewritten && rewritten.bullets.length > 0,
      orphaned: false,
    };
  });

  const known = new Set(roles.map((r) => r.key));
  for (const [key, value] of Object.entries(overlay)) {
    if (known.has(key) || value.bullets.length === 0) continue;
    const [company, title] = key.split("|");
    merged.push({
      key,
      company: company ?? "",
      title: title ?? "",
      start: null,
      end: null,
      originalBullets: [],
      bullets: value.bullets,
      rewritten: true,
      orphaned: true,
    });
  }

  return merged;
}
