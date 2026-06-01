/**
 * Career Identity Blueprint — 30 questions × per-option axis weights.
 *
 * Single source of truth for the runner UI and `computeAxes`. Question text +
 * option labels are lifted from the prototype verbatim (docs/prototypes/
 * career-identity-blueprint.html lines 686–717); per-option weight maps are
 * NEW — they replace the prototype's ~25 loose keys with votes into the
 * canonical §2.5 axes only. Dead-end prototype keys (`digital`, raw `creative`,
 * `leadership` ungated, `active`, `meeting_drain` granularity, etc.) are not
 * ported.
 */

import type { BlueprintQuestion } from "./types";

export const QUESTIONS: BlueprintQuestion[] = [
  // ──────────────────────────── Energy & Work Style (1–5)
  {
    section: "energy",
    text: "At the end of a productive workday, what most likely energized you?",
    options: [
      {
        label: "Collaborating and brainstorming with others",
        weights: { value_collaborative: 1, people: 1, external: 1 },
      },
      {
        label: "Solving a difficult strategic or technical problem",
        weights: { analytical: 1, vision: 1, value_innovative: 1 },
      },
      {
        label: "Completing meaningful work efficiently",
        weights: { execution: 1, value_results: 1 },
      },
      {
        label: "Influencing decisions or driving momentum",
        weights: { vision: 1, ls_performance: 1, drv_impact: 1 },
      },
    ],
  },
  {
    section: "energy",
    text: "When starting a major initiative, you naturally prefer:",
    options: [
      {
        label: "Flexibility and room to experiment",
        weights: { autonomy: 2, value_innovative: 1 },
      },
      {
        label: "A clear structure and defined process",
        weights: { structure: 2, value_results: 1 },
      },
      {
        label: "Strong collaboration and alignment",
        weights: { value_collaborative: 2, people: 1 },
      },
      {
        label: "Full ownership and autonomy",
        weights: { autonomy: 2, vision: 1, drv_freedom: 1 },
      },
    ],
  },
  {
    section: "energy",
    text: "Which environment sounds MOST energizing?",
    options: [
      {
        label: "Fast-moving startup with constant innovation",
        weights: { stage_startup: 3, autonomy: 1, intensity: 1 },
      },
      {
        label: "Collaborative growth company building new systems",
        weights: { stage_growth: 3, value_collaborative: 1 },
      },
      {
        label: "Large enterprise with scale and complexity",
        weights: { stage_enterprise: 3, structure: 1 },
      },
      {
        label: "Mission-driven organization focused on impact",
        weights: { stage_mission: 3, value_purpose: 1, drv_impact: 1 },
      },
    ],
  },
  {
    section: "energy",
    text: "How do you typically recharge after intense work periods?",
    options: [
      { label: "Social connection", weights: { external: 2 } },
      { label: "Quiet reflection", weights: { internal: 2 } },
      {
        label: "Creative activities",
        weights: { internal: 1, value_innovative: 1 },
      },
      {
        label: "Physical activity or movement",
        weights: { external: 1, sustainability: 1 },
      },
    ],
  },
  {
    section: "energy",
    text: "Which type of work drains you the fastest?",
    options: [
      {
        label: "Repetitive administrative tasks",
        weights: { burnout_risk: 1, drv_growth: 1 },
      },
      {
        label: "Excessive meetings with little progress",
        weights: { burnout_risk: 1, drv_freedom: 1 },
      },
      {
        label: "Constant ambiguity and chaos",
        weights: { burnout_risk: 1, structure: 1 },
      },
      {
        label: "Highly political environments",
        weights: { burnout_risk: 2, value_collaborative: 1 },
      },
    ],
  },

  // ──────────────────────────── Leadership & Influence (6–10)
  {
    section: "leadership",
    text: "During high-pressure situations, you naturally become the person who:",
    options: [
      {
        label: "Brings calm and emotional stability",
        weights: { people: 2, ls_empowerment: 2 },
      },
      {
        label: "Creates structure and clear priorities",
        weights: { structure: 1, ls_precision: 2, ls_systems: 1 },
      },
      {
        label: "Motivates the team toward action",
        weights: { ls_performance: 3, drv_impact: 1 },
      },
      {
        label: "Solves the most complex problems",
        weights: { analytical: 2, ls_systems: 2 },
      },
    ],
  },
  {
    section: "leadership",
    text: "What leadership style do you most admire?",
    options: [
      {
        label: "Inspirational and visionary",
        weights: { vision: 2, ls_vision: 2 },
      },
      {
        label: "Strategic and analytical",
        weights: { analytical: 2, ls_systems: 2 },
      },
      {
        label: "Coaching and empowering",
        weights: { people: 2, ls_empowerment: 2 },
      },
      {
        label: "Operational and execution-focused",
        weights: { execution: 2, ls_precision: 2 },
      },
    ],
  },
  {
    section: "leadership",
    text: "When making decisions, what matters most?",
    options: [
      {
        label: "Logic and long-term impact",
        weights: { analytical: 1, vision: 1, ls_systems: 1 },
      },
      {
        label: "Team impact and relationships",
        weights: { people: 2, ls_empowerment: 1 },
      },
      {
        label: "Speed and momentum",
        weights: { intensity: 1, ls_performance: 3 },
      },
      {
        label: "Risk reduction and stability",
        weights: { structure: 1, ls_precision: 1, drv_stability: 1 },
      },
    ],
  },
  {
    section: "leadership",
    text: "When leading others, you naturally focus most on:",
    options: [
      {
        label: "Developing people",
        weights: { people: 2, ls_empowerment: 2, value_collaborative: 1 },
      },
      {
        label: "Delivering results",
        weights: { execution: 1, value_results: 2, ls_performance: 2 },
      },
      {
        label: "Creating innovation",
        weights: { vision: 1, value_innovative: 2, ls_vision: 1 },
      },
      {
        label: "Building sustainable systems",
        weights: { structure: 1, ls_systems: 2 },
      },
    ],
  },
  {
    section: "leadership",
    text: "How do you usually influence people?",
    options: [
      {
        label: "Through expertise and intelligence",
        weights: { analytical: 1, ls_systems: 1 },
      },
      {
        label: "Through relationships and trust",
        weights: { people: 2, value_collaborative: 1, ls_empowerment: 1 },
      },
      {
        label: "Through confidence and momentum",
        weights: { ls_performance: 2 },
      },
      {
        label: "Through organization and consistency",
        weights: { structure: 1, execution: 1, ls_precision: 1 },
      },
    ],
  },

  // ──────────────────────────── Company Culture Fit (11–15)
  {
    section: "culture",
    text: "Which environment sounds MOST appealing?",
    options: [
      {
        label: "High-growth and entrepreneurial",
        weights: {
          stage_startup: 2,
          stage_growth: 1,
          intensity: 1,
          value_innovative: 1,
        },
      },
      {
        label: "Stable with strong systems and structure",
        weights: { stage_enterprise: 2, structure: 2, value_results: 1 },
      },
      {
        label: "Collaborative and people-focused",
        weights: { value_collaborative: 2, people: 1 },
      },
      {
        label: "Highly innovative and disruptive",
        weights: { value_innovative: 2, vision: 1, stage_startup: 1 },
      },
    ],
  },
  {
    section: "culture",
    text: "What frustrates you most at work?",
    options: [
      {
        label: "Slow decision making",
        weights: { intensity: 1, autonomy: 1 },
      },
      { label: "Lack of direction or structure", weights: { structure: 2 } },
      {
        label: "Poor communication",
        weights: { value_collaborative: 1, people: 1 },
      },
      { label: "Lack of growth opportunities", weights: { drv_growth: 2 } },
    ],
  },
  {
    section: "culture",
    text: "How much structure do you prefer?",
    options: [
      {
        label: "Very little — I like freedom and flexibility",
        weights: { autonomy: 3, drv_freedom: 1 },
      },
      {
        label: "Moderate structure with room to adapt",
        weights: { autonomy: 1 },
      },
      { label: "Clear systems and expectations", weights: { structure: 2 } },
      { label: "Highly organized processes", weights: { structure: 3 } },
    ],
  },
  {
    section: "culture",
    text: "What type of leadership environment helps you thrive?",
    options: [
      {
        label: "High autonomy",
        weights: { autonomy: 2, drv_freedom: 1, value_innovative: 1 },
      },
      { label: "Strong mentorship", weights: { people: 1, drv_growth: 1 } },
      {
        label: "Collaborative teamwork",
        weights: { value_collaborative: 2, people: 1 },
      },
      {
        label: "Performance-driven accountability",
        weights: { value_results: 2, ls_performance: 1 },
      },
    ],
  },
  {
    section: "culture",
    text: "Which statement sounds MOST like you?",
    options: [
      {
        label: "I enjoy building things from the ground up.",
        weights: { vision: 2, stage_startup: 1 },
      },
      {
        label: "I enjoy optimizing and scaling systems.",
        weights: { execution: 1, value_results: 1, ls_systems: 1 },
      },
      {
        label: "I enjoy helping teams align and grow.",
        weights: { people: 2, value_collaborative: 1 },
      },
      {
        label: "I enjoy solving complex strategic problems.",
        weights: { analytical: 2, vision: 1 },
      },
    ],
  },

  // ──────────────────────────── Energy Audit (16–20)
  {
    section: "audit",
    text: "Which responsibility naturally energizes you?",
    options: [
      {
        label: "Strategy and planning",
        weights: { vision: 1, analytical: 1 },
      },
      {
        label: "Mentoring and developing people",
        weights: { people: 2, drv_growth: 1 },
      },
      {
        label: "Solving operational problems",
        weights: { execution: 2, analytical: 1 },
      },
      {
        label: "Presenting ideas or influencing others",
        weights: { cs_executive: 1, ls_performance: 1, external: 1 },
      },
    ],
  },
  {
    section: "audit",
    text: "Which responsibility drains you the fastest?",
    options: [
      {
        label: "Excessive reporting / admin work",
        weights: { burnout_risk: 1 },
      },
      {
        label: "Constant conflict management",
        weights: { burnout_risk: 2 },
      },
      {
        label: "Repetitive execution work",
        weights: { burnout_risk: 1, drv_growth: 1 },
      },
      {
        label: "Lack of clarity or shifting priorities",
        weights: { burnout_risk: 1, structure: 1 },
      },
    ],
  },
  {
    section: "audit",
    text: "Which meetings do you usually enjoy MOST?",
    options: [
      {
        label: "Strategic planning discussions",
        weights: { vision: 1, analytical: 1 },
      },
      {
        label: "Collaborative brainstorming",
        weights: { value_collaborative: 2, external: 1 },
      },
      {
        label: "Problem-solving sessions",
        weights: { execution: 1, analytical: 1 },
      },
      {
        label: "Leadership or decision-making meetings",
        weights: { ls_performance: 2 },
      },
    ],
  },
  {
    section: "audit",
    text: "Which stakeholder type brings out your BEST work?",
    options: [
      { label: "Visionary leaders", weights: { vision: 1 } },
      {
        label: "Collaborative peers",
        weights: { value_collaborative: 2 },
      },
      {
        label: "High-accountability teams",
        weights: { value_results: 2 },
      },
      {
        label: "Mentorship-oriented leaders",
        weights: { people: 1, drv_growth: 1 },
      },
    ],
  },
  {
    section: "audit",
    text: "Which environment creates the most burnout risk for you?",
    options: [
      {
        label: "Micromanagement",
        weights: { burnout_risk: 1, drv_freedom: 1, autonomy: 1 },
      },
      {
        label: "Constant urgency and chaos",
        weights: { burnout_risk: 2, sustainability: 1 },
      },
      {
        label: "Highly political cultures",
        weights: { burnout_risk: 1, value_collaborative: 1 },
      },
      {
        label: "Isolation and lack of collaboration",
        weights: { burnout_risk: 1, value_collaborative: 1, people: 1 },
      },
    ],
  },

  // ──────────────────────────── Communication & Brand (21–25)
  {
    section: "communication",
    text: "How do you naturally communicate ideas?",
    options: [
      {
        label: "Concisely and strategically",
        weights: { cs_executive: 2 },
      },
      {
        label: "Through stories and examples",
        weights: { cs_storytelling: 2 },
      },
      { label: "Through logic and data", weights: { cs_analytical: 2 } },
      {
        label: "Through collaboration and discussion",
        weights: { cs_advisor: 2 },
      },
    ],
  },
  {
    section: "communication",
    text: "How comfortable are you being professionally visible online?",
    options: [
      {
        label: "Very comfortable",
        weights: { cs_storytelling: 1, external: 1 },
      },
      { label: "Somewhat comfortable", weights: {} },
      { label: "Neutral", weights: {} },
      {
        label: "Prefer to stay behind the scenes",
        weights: { internal: 1, cs_advisor: 1 },
      },
    ],
  },
  {
    section: "communication",
    text: "When networking, you naturally prefer:",
    options: [
      {
        label: "Deep one-on-one conversations",
        weights: { internal: 2, cs_advisor: 1 },
      },
      {
        label: "Large energetic environments",
        weights: { external: 2, cs_storytelling: 1 },
      },
      { label: "Small curated groups", weights: { cs_advisor: 1 } },
      { label: "Online relationship building", weights: { internal: 1 } },
    ],
  },
  {
    section: "communication",
    text: "What best describes your communication style in interviews?",
    options: [
      { label: "Executive and concise", weights: { cs_executive: 2 } },
      {
        label: "Warm and relational",
        weights: { cs_advisor: 2, people: 1 },
      },
      {
        label: "Analytical and detailed",
        weights: { cs_analytical: 2, analytical: 1 },
      },
      {
        label: "Energetic and persuasive",
        weights: { cs_storytelling: 2, ls_performance: 1 },
      },
    ],
  },
  {
    section: "communication",
    text: "What type of professional content are you most likely to share?",
    options: [
      {
        label: "Leadership insights",
        weights: { cs_executive: 1, vision: 1 },
      },
      {
        label: "Industry trends and strategy",
        weights: { cs_analytical: 1, analytical: 1 },
      },
      {
        label: "Inspirational or motivational ideas",
        weights: { cs_storytelling: 1, value_purpose: 1 },
      },
      {
        label: "Operational or educational insights",
        weights: { cs_analytical: 1, execution: 1 },
      },
    ],
  },

  // ──────────────────────────── Career Direction (26–30)
  {
    section: "direction",
    text: "What motivates you MOST professionally?",
    options: [
      {
        label: "Impact and purpose",
        weights: { drv_impact: 2, stage_mission: 1, value_purpose: 1 },
      },
      {
        label: "Growth and achievement",
        weights: { drv_growth: 2, ls_performance: 1 },
      },
      { label: "Financial freedom", weights: { drv_freedom: 2 } },
      {
        label: "Stability and sustainability",
        weights: { drv_stability: 2, structure: 1, sustainability: 1 },
      },
    ],
  },
  {
    section: "direction",
    text: "What type of career growth excites you most?",
    options: [
      {
        label: "Executive leadership",
        weights: { drv_impact: 1, drv_growth: 1, ls_vision: 1 },
      },
      {
        label: "Entrepreneurship or ownership",
        weights: {
          drv_freedom: 1,
          stage_startup: 1,
          autonomy: 1,
          vision: 1,
        },
      },
      {
        label: "Deep expertise / mastery",
        weights: { analytical: 1, drv_growth: 1 },
      },
      {
        label: "Building and mentoring teams",
        weights: { people: 1, ls_empowerment: 1, drv_growth: 1 },
      },
    ],
  },
  {
    section: "direction",
    text: "How do you feel about career reinvention?",
    options: [
      {
        label: "Excited by change and evolution",
        weights: { autonomy: 2, value_innovative: 1, drv_growth: 1 },
      },
      { label: "Open but cautious", weights: {} },
      {
        label: "Prefer stability and predictability",
        weights: { structure: 2, drv_stability: 1 },
      },
      {
        label: "Interested if aligned with purpose",
        weights: { drv_impact: 1, value_purpose: 1 },
      },
    ],
  },
  {
    section: "direction",
    text: "Which statement sounds MOST true?",
    options: [
      {
        label: "I want to build something meaningful.",
        weights: { vision: 1, drv_impact: 1, value_purpose: 1 },
      },
      {
        label: "I want to lead at a high level.",
        weights: { vision: 1, drv_impact: 1, ls_vision: 1 },
      },
      {
        label: "I want flexibility and freedom.",
        weights: { drv_freedom: 2, autonomy: 1 },
      },
      {
        label: "I want deep mastery and expertise.",
        weights: { analytical: 1, drv_growth: 1 },
      },
    ],
  },
  {
    section: "direction",
    text: "What do you want your career to ultimately provide?",
    options: [
      {
        label: "Meaningful impact",
        weights: { drv_impact: 2, value_purpose: 1 },
      },
      {
        label: "Financial success",
        weights: { drv_freedom: 1, value_results: 1, ls_performance: 1 },
      },
      { label: "Freedom and flexibility", weights: { drv_freedom: 2 } },
      {
        label: "Long-term stability and fulfillment",
        weights: { drv_stability: 2, sustainability: 1 },
      },
    ],
  },
];
