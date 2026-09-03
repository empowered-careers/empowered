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

  // Booking webhook signing secrets, one per provider. When unset the matching
  // webhook route 503s, so bookings simply aren't recorded — same posture as
  // Stripe below.
  CAL_WEBHOOK_SECRET: z.string().optional(),
  CALENDLY_WEBHOOK_SECRET: z.string().optional(),

  // Stripe (server-side billing). All optional until the Stripe Dashboard is
  // provisioned — when unset, the app boots normally; Checkout/portal/webhook
  // routes simply can't run yet.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Stripe price IDs — the catalog lives in the Stripe Dashboard. The two
  // subscription tiers (Core = plan_2, Pro = plan_3), each billed monthly or
  // quarterly. (À la carte services are priced via coaching_products.stripe_price_id.)
  STRIPE_PRICE_CORE_MONTHLY: z.string().optional(),
  STRIPE_PRICE_CORE_QUARTERLY: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PRO_QUARTERLY: z.string().optional(),

  // Purchase gate. When "true", signed-in candidates need an enrollment (i.e.
  // a completed Stripe purchase) to reach the app. Anything else = fully inert,
  // no behavior change anywhere. Entitlement is read from `enrollments` —
  // never from user metadata, which the browser session can write itself.
  PURCHASE_GATE_ENABLED: z.string().optional(),

  // Beta invite code (e.g. ECTEST100). Redeeming it at /invite grants a comp
  // "Beta Access" enrollment, so a tester gets in without paying. Mirrors the
  // string of the 100%-off Stripe promotion code of the same name, which is the
  // other way in — via real checkout. Unset = no redemption path at all.
  BETA_INVITE_CODE: z.string().optional(),

  // Versioned at code level; bump when prompts/rubric change
  RESUME_PROMPT_VERSION: z.string().default("1.1.0"),
  LINKEDIN_PROMPT_VERSION: z.string().default("1.1.0"),

  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
