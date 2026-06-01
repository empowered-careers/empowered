/**
 * Career Identity Blueprint — static copy.
 *
 * Archetypes / leadership / company-fit / comm-style / interview / strategy /
 * linkedin lines lifted from docs/prototypes/career-identity-blueprint.html
 * (lines 821–998) + docs/assessment.md.
 *
 * The 5-archetype model collapses the prototype's split between people-led and
 * mission-led "Purpose-Driven Catalyst" into a single empowerment archetype;
 * leadership_style is the canonical key.
 */

import type {
  CommunicationStyle,
  CompanyStageKey,
  LeadershipStyle,
} from "./types";

// ────────────────────────────────────────────────────────────
// Archetype + leadership copy — keyed by LeadershipStyle
// ────────────────────────────────────────────────────────────

interface ArchetypeContent {
  archetypeName: string;
  archetypeTagline: string;
  leadershipTitle: string;
  leadershipBody: string;
  leadershipTags: string[];
}

export const ARCHETYPES: Record<LeadershipStyle, ArchetypeContent> = {
  vision_led: {
    archetypeName: "The Visionary Builder™",
    archetypeTagline:
      "Big-picture strategist who thrives building transformative ideas and scaling innovation.",
    leadershipTitle: "Vision-Led Leader™",
    leadershipBody:
      "You lead through inspiration and forward momentum. Teams follow your clarity of direction and ability to paint a compelling future. You're most powerful when setting bold direction and empowering others to execute.",
    leadershipTags: ["Inspirational", "Strategic", "Future-Focused"],
  },
  strategic_systems: {
    archetypeName: "The Analytical Architect™",
    archetypeTagline:
      "Systems-oriented thinker who solves complex problems with precision and strategic depth.",
    leadershipTitle: "Strategic Systems Leader™",
    leadershipBody:
      "You lead through data, structured thinking, and systems design. Your teams trust your analytical rigor and ability to identify patterns others miss. You create frameworks that scale.",
    leadershipTags: ["Analytical", "Systems Thinker", "Frameworks"],
  },
  empowerment: {
    archetypeName: "The Purpose-Driven Catalyst™",
    archetypeTagline:
      "Mission-oriented leader who inspires teams, builds authentic trust, and creates meaningful impact.",
    leadershipTitle: "Empowerment Leader™",
    leadershipBody:
      "You lead by developing people and building deep trust. Your coaching instinct and emotional intelligence make you a powerful people leader. Teams perform best under your guidance.",
    leadershipTags: ["People-Centered", "Coaching", "Trust-Building"],
  },
  precision: {
    archetypeName: "The Trusted Operator™",
    archetypeTagline:
      "Highly dependable leader who creates structure, execution excellence, and operational reliability.",
    leadershipTitle: "Precision Leader™",
    leadershipBody:
      "You lead through operational excellence and consistent delivery. You build systems that scale and hold teams accountable with clarity. Organizations trust you to execute on what matters most.",
    leadershipTags: ["Operational", "Reliable", "Execution-Focused"],
  },
  performance: {
    archetypeName: "The Strategic Influencer™",
    archetypeTagline:
      "Results-driven leader who accelerates growth, drives competitive performance, and creates marketplace momentum.",
    leadershipTitle: "Performance Leader™",
    leadershipBody:
      "You lead by raising the bar. Your competitive energy, urgency, and results-orientation push teams to their best. You thrive in growth environments and turnaround situations.",
    leadershipTags: ["Results-Driven", "Competitive", "High-Tempo"],
  },
};

// ────────────────────────────────────────────────────────────
// Company-fit copy — keyed by dominant CompanyStageKey
// ────────────────────────────────────────────────────────────

export const COMPANY_FIT: Record<
  CompanyStageKey,
  { title: string; body: string; tags: string[] }
> = {
  startup: {
    title: "Startup & Entrepreneurial Environments",
    body: "You're wired for speed, ownership, and building from scratch. Startup and early-stage environments energize your best work.",
    tags: ["Startup", "Scale-Up", "Founder Roles", "VC-backed Companies"],
  },
  growth: {
    title: "Growth-Stage Organizations",
    body: "You thrive where momentum is building — established enough for systems but dynamic enough for innovation.",
    tags: ["Series B–D", "Growth Companies", "Mid-Market", "Scaling Teams"],
  },
  enterprise: {
    title: "Large Enterprise & Complex Organizations",
    body: "You thrive in environments with organizational complexity, strategic scale, and multi-stakeholder leadership.",
    tags: [
      "Fortune 500",
      "Global Corporations",
      "Enterprise Strategy",
      "Complex Orgs",
    ],
  },
  mission: {
    title: "Mission-Driven Organizations",
    body: "Purpose-driven environments where your work creates meaningful impact beyond a paycheck energize you deeply.",
    tags: ["Nonprofits", "Social Impact", "B-Corps", "Healthcare", "Education"],
  },
};

// ────────────────────────────────────────────────────────────
// Communication style copy — keyed by CommunicationStyle
// ────────────────────────────────────────────────────────────

export const COMM_STYLES: Record<
  CommunicationStyle,
  { title: string; body: string }
> = {
  executive: {
    title: "Executive Strategist™",
    body: "Concise, authoritative, and business-oriented. You communicate with strategic precision that resonates in board rooms and executive settings.",
  },
  storytelling: {
    title: "Storytelling Influencer™",
    body: "Emotionally engaging and persuasive. You connect through narrative and make complex ideas feel inspiring and accessible.",
  },
  analytical: {
    title: "Analytical Communicator™",
    body: "Precise, logical, and data-driven. You build credibility through structured thinking and evidence-backed communication.",
  },
  trusted_advisor: {
    title: "Trusted Advisor™",
    body: "Warm, thoughtful, and relationship-centered. You build trust through genuine connection and create safety for honest dialogue.",
  },
};

// ────────────────────────────────────────────────────────────
// Burnout band copy
// ────────────────────────────────────────────────────────────

export const BURNOUT_COPY = {
  low: {
    title: "Low Risk",
    body: "Your current energy patterns suggest strong sustainability. Maintain alignment between your responsibilities and natural strengths.",
    pct: 22,
  },
  moderate: {
    title: "Moderate Risk",
    body: "Watch for overcommitment cycles. Build intentional recovery time and ensure your responsibilities align with your natural energy profile.",
    pct: 48,
  },
  high: {
    title: "Elevated Risk",
    body: "Your responses indicate significant drain from current or potential work patterns. Prioritize boundary-setting, meaningful work alignment, and recovery rituals.",
    pct: 78,
  },
} as const;

// ────────────────────────────────────────────────────────────
// Green-light strength banks — keyed by dominant orientation
// ────────────────────────────────────────────────────────────

export const GREEN_LIGHT_BANKS = {
  vision: [
    "Strategic planning",
    "Innovation",
    "Stakeholder influence",
    "Visioning & roadmapping",
  ],
  people: [
    "Mentoring & coaching",
    "Team alignment",
    "Collaborative problem-solving",
    "Relationship building",
  ],
  analytical: [
    "Systems design",
    "Process optimization",
    "Data analysis",
    "Execution planning",
  ],
} as const;

// ────────────────────────────────────────────────────────────
// Red-light drain labels
// ────────────────────────────────────────────────────────────

export const RED_LIGHT_DEFAULTS = ["Excessive bureaucracy", "Lack of autonomy"];

// ────────────────────────────────────────────────────────────
// Interview / Strategy / LinkedIn line banks
// ────────────────────────────────────────────────────────────

export const INTERVIEW_LINES = {
  vision: [
    "Lead with your strategic vision — explain the 'why' before the 'how' in every answer.",
    "Use concise executive storytelling: situation → decision → impact. Keep stories under 90 seconds.",
    "Quantify transformation: headcount growth, revenue impact, market expansion, or cost reduction.",
    "Avoid getting lost in operational detail. Connect every story back to business outcomes.",
  ],
  people: [
    "Lean into leadership examples that showcase team development, culture-building, and coaching.",
    "Share specific stories of stakeholder alignment and navigating competing priorities.",
    "Demonstrate emotional intelligence by describing how you've handled conflict or difficult personalities.",
    "Quantify your people impact: retention improvements, team growth, engagement scores, or promotions driven.",
  ],
  analytical: [
    "Lead with data and metrics — quantify every accomplishment you share.",
    "Demonstrate systems thinking by showing how your work connected to larger organizational outcomes.",
    "Slow down before diving into technical detail — always frame with business impact first.",
    "Use STAR format consistently and practice keeping responses under 2 minutes.",
  ],
} as const;

export const STRATEGY_LINES: Record<CompanyStageKey, string[]> = {
  startup: [
    "Target Series A–C companies where you can own a function and build from early stage.",
    "Position yourself as a builder — emphasize founding, creating, or scaling experiences on your resume.",
    "Investor-backed companies and founder-led organizations will resonate strongly with your profile.",
    "Network through startup ecosystems, VC communities, and accelerator events.",
  ],
  growth: [
    "Growth-stage companies (Series B through pre-IPO) are your highest-alignment targets.",
    "Look for environments where you can influence strategy while building the systems that scale it.",
    "Highlight experiences that bridge innovation and execution — organizations at this stage need both.",
    "Identify companies growing 30–100% YoY where your energy and adaptability are competitive advantages.",
  ],
  enterprise: [
    "Focus on enterprise organizations with complex stakeholder environments and strategic scope.",
    "Emphasize your ability to lead through ambiguity, influence cross-functional teams, and navigate scale.",
    "Target large-cap companies, Fortune 500s, and global organizations where your profile commands a premium.",
    "LinkedIn and executive search are your strongest job search channels — optimize accordingly.",
  ],
  mission: [
    "Target mission-driven organizations whose values genuinely align with what motivates you.",
    "Lead with impact stories on your resume — outcomes for the community, customer, or cause you served.",
    "Nonprofits, B-Corps, and social-impact teams inside larger companies are all strong fits.",
    "Network through purpose-driven communities, conferences, and alumni networks tied to your cause area.",
  ],
};

export const LINKEDIN_LINES: Record<CommunicationStyle, string[]> = {
  executive: [
    "Your LinkedIn headline should establish authority — lead with your title tier and strategic specialty.",
    "Write your About section in first person with a confident, concise executive voice. 3–4 short paragraphs.",
    "Share thought leadership content: strategic perspectives on your industry, not just reposted articles.",
    "Position yourself as an authority — your audience responds to intelligence and credibility, not promotion.",
  ],
  storytelling: [
    "Your About section should open with a narrative hook — a brief story that reveals your 'why'.",
    "Share content that tells stories of transformation, impact, and lessons learned.",
    "Video content and speaking engagements will accelerate your visibility faster than posts alone.",
    "Let your personality show — your authentic voice is your brand differentiator.",
  ],
  analytical: [
    "Lead with credentials, certifications, and data-backed achievements in your headline and About section.",
    "Share analytical insights, industry research, and data-driven perspectives — your audience values precision.",
    "Your About section should emphasize expertise depth and problem-solving capability.",
    "Case study-style posts perform strongly for your profile: here's the problem, here's the data, here's what I did.",
  ],
  trusted_advisor: [
    "Your LinkedIn presence should feel warm, human, and relationship-centered — let your authentic self show.",
    "Engage generously — comments and replies build your network faster than posts alone for your profile type.",
    "Share behind-the-scenes leadership lessons and team-building stories that showcase your people instincts.",
    "Your headline should combine your expertise with your human impact: 'People Leader | Building teams that thrive'.",
  ],
};

// ────────────────────────────────────────────────────────────
// Red-light drain bank — used when blueprint detects specific risk patterns
// ────────────────────────────────────────────────────────────

export const RED_LIGHT_BANK = {
  political: "Political environments",
  micromanagement: "Micromanagement",
  chaos: "Constant urgency & chaos",
  isolation: "Isolation & lack of collaboration",
  bureaucracy: "Excessive bureaucracy",
  conflict: "Constant conflict management",
  admin: "Repetitive admin work",
  ambiguity: "Constant ambiguity",
} as const;

// ────────────────────────────────────────────────────────────
// Symmetry bar labels (six rows, axis-derived in blueprint.ts)
// ────────────────────────────────────────────────────────────

export const SYMMETRY_LABELS = [
  "Purpose Alignment",
  "Energy Alignment",
  "Leadership Alignment",
  "Cultural Alignment",
  "Growth Alignment",
  "Lifestyle Alignment",
] as const;

// ────────────────────────────────────────────────────────────
// Section metadata for the runner UI
// ────────────────────────────────────────────────────────────

export const SECTION_META = {
  energy: { label: "Energy & Work Style", icon: "Zap" },
  leadership: { label: "Leadership & Influence", icon: "Crown" },
  culture: { label: "Company Culture Fit", icon: "Building2" },
  audit: { label: "Energy Audit™", icon: "BatteryCharging" },
  communication: { label: "Communication & Brand", icon: "MessageSquare" },
  direction: { label: "Career Direction", icon: "Rocket" },
} as const;
