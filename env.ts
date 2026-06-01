import { z } from "zod";

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "Supabase publishable key is required"),

  // Optional Supabase secret key (server-side only)
  SUPABASE_SECRET_KEY: z.string().optional(),

  // App configuration
  NEXT_PUBLIC_APP_NAME: z.string().default("Next.js Starter"),
  NEXT_PUBLIC_APP_URL: z.string().min(1).url().optional(),

  // SEO
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: z.string().optional(),

  // Anthropic (server-side only; required for resume parsing/scoring)
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_PARSER_MODEL: z.string().default("claude-haiku-4-5-20251001"),
  ANTHROPIC_SCORER_MODEL: z.string().default("claude-sonnet-4-6"),

  // Inngest (server-side only; dev server doesn't require these)
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  // Loops (transactional email + lifecycle events). Optional in dev — when
  // unset, lead.* event firing is a no-op so local registration still works.
  LOOPS_API_KEY: z.string().optional(),

  // Versioned at code level; bump when prompts/rubric change
  RESUME_PROMPT_VERSION: z.string().default("1.0.0"),
  LINKEDIN_PROMPT_VERSION: z.string().default("1.0.0"),

  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
