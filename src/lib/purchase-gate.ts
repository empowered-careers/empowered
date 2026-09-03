/**
 * Purchase gate — does this candidate have to buy something before the app
 * opens up?
 *
 * Entitlement comes from `enrollments` (CLAUDE.md rule 2: the à la carte
 * source of truth, written by the Stripe webhook on
 * `checkout.session.completed`). A 100%-off promotion code still produces a
 * completed session, so an "invite code" handed to a beta tester is just a
 * Stripe coupon — there is no separate code to verify here.
 *
 * Pure so the branch order is testable without a session or a database; see
 * `purchase-gate.check.ts`.
 */

/** Off unless explicitly "true" — a missing or malformed value never gates. */
export function purchaseGateEnabled(): boolean {
  return process.env.PURCHASE_GATE_ENABLED === "true";
}

export interface PurchaseGateInput {
  /** `purchaseGateEnabled()`, passed in so this stays pure. */
  enabled: boolean;
  /** Admins always get in — they're the ones who'd have to unlock it. */
  isAdmin: boolean;
  /** Any active/completed enrollment. See `hasAnyEnrollment()`. */
  hasEnrollment: boolean;
}

export function needsPurchase({
  enabled,
  isAdmin,
  hasEnrollment,
}: PurchaseGateInput): boolean {
  if (!enabled) return false;
  if (isAdmin) return false;
  return !hasEnrollment;
}

/**
 * Beta invite code comparison. Case- and whitespace-insensitive because the
 * code gets copy-pasted out of an email; an empty expected code never matches,
 * so an unset `BETA_INVITE_CODE` can't be redeemed with an empty input.
 */
export function matchesInviteCode(
  input: string,
  expected: string | undefined
): boolean {
  const want = expected?.trim().toUpperCase();
  if (!want) return false;
  return input.trim().toUpperCase() === want;
}
