import { z } from "zod";

export const SeniorityLevelSchema = z.enum([
  "ic",
  "senior",
  "staff",
  "principal",
  "director",
  "vp",
  "c_level",
]);
export type SeniorityLevel = z.infer<typeof SeniorityLevelSchema>;

export const WorkExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  start: z.string().nullable(),
  end: z.string().nullable(),
  bullets: z.array(z.string()).default([]),
});

export const EducationSchema = z.object({
  school: z.string(),
  degree: z.string().nullable(),
  field: z.string().nullable(),
  start: z.string().nullable(),
  end: z.string().nullable(),
});

export const ParsedResumeSchema = z.object({
  raw_text: z.string(),
  skills: z.array(z.string()),
  work_experience: z.array(WorkExperienceSchema),
  education: z.array(EducationSchema),
  seniority_level: SeniorityLevelSchema.nullable(),
  total_years_exp: z.number().min(0).max(60).nullable(),
});
export type ParsedResume = z.infer<typeof ParsedResumeSchema>;

export const ScoringDimensionsSchema = z.object({
  tenure: z.number().int().min(0).max(100),
  role_progression: z.number().int().min(0).max(100),
  skill_density: z.number().int().min(0).max(100),
  impact_signals: z.number().int().min(0).max(100),
  formatting: z.number().int().min(0).max(100),
});

export const ScoringSchema = z.object({
  overall: z.number().int().min(0).max(100),
  dimensions: ScoringDimensionsSchema,
  reasoning: z.string(),
});
export type Scoring = z.infer<typeof ScoringSchema>;

// ─── LinkedIn ────────────────────────────────────────────────

export const LinkedInExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  start: z.string().nullable(),
  end: z.string().nullable(),
  location: z.string().nullable(),
  bullets: z.array(z.string()).default([]),
});

export const LinkedInEducationSchema = z.object({
  school: z.string(),
  degree: z.string().nullable(),
  field: z.string().nullable(),
  start: z.string().nullable(),
  end: z.string().nullable(),
});

export const LinkedInCertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().nullable(),
  issued_at: z.string().nullable(),
  expires_at: z.string().nullable(),
});

export const ParsedLinkedInSchema = z.object({
  about: z.string().nullable(),
  experience: z.array(LinkedInExperienceSchema),
  education: z.array(LinkedInEducationSchema),
  skills: z.array(z.string()),
  certifications: z.array(LinkedInCertificationSchema).default([]),
  languages: z.array(z.string()).default([]),
  honors_awards: z.array(z.string()).default([]),
  publications: z.array(z.string()).default([]),
  recommendations_received_count: z.number().int().min(0).default(0),
});
export type ParsedLinkedIn = z.infer<typeof ParsedLinkedInSchema>;

export const LinkedInScoringDimensionsSchema = z.object({
  headline_quality: z.number().int().min(0).max(100),
  about_quality: z.number().int().min(0).max(100),
  experience_depth: z.number().int().min(0).max(100),
  skill_density: z.number().int().min(0).max(100),
  profile_completeness: z.number().int().min(0).max(100),
});

export const LinkedInScoringSchema = z.object({
  overall: z.number().int().min(0).max(100),
  dimensions: LinkedInScoringDimensionsSchema,
  reasoning: z.string(),
});
export type LinkedInScoring = z.infer<typeof LinkedInScoringSchema>;
