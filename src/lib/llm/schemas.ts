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
