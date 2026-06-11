import Stripe from "stripe";

import { env } from "../../../env";

/**
 * Server-only Stripe SDK singleton. Never import from a Client Component.
 *
 * The API version is intentionally left unset — Stripe uses the account's
 * default pinned version. `STRIPE_SECRET_KEY` is optional in `env.ts` (the app
 * boots without it), so callers must handle the "not configured" throw.
 */
let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripeSingleton;
}

/** True when Stripe is provisioned (keys present). Lets pages degrade gracefully. */
export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}
