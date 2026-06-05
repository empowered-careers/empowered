import type { SupabaseClient } from "@supabase/supabase-js";

import {
  fireCandidatePayment,
  fireCandidatePlanUpgraded,
} from "@/lib/loops/client";
import { createNotification } from "@/lib/notifications/create";
import { comparePlans } from "@/lib/plan";
import type { Database } from "@/types/database.types";
import type { Plan, ProductType, SubscriptionStatus } from "@/types/db";

import { priceIdToPlan } from "./prices";

type ServiceClient = SupabaseClient<Database>;

// Stripe object shapes vary slightly across SDK/API versions. We read only the
// fields we need through minimal local types so this code doesn't break when
// the pinned API version moves.
interface MinimalCheckoutSession {
  metadata: Record<string, string> | null;
  payment_intent: string | { id: string } | null;
  amount_total: number | null;
}

interface MinimalSubscription {
  customer: string | { id: string };
  status: string;
  items: { data: Array<{ price: { id: string } }> };
}

interface MinimalInvoice {
  id: string;
  customer: string | { id: string } | null;
  payment_intent?: string | { id: string } | null;
  subscription?: string | { id: string } | null;
  lines: { data: Array<{ price?: { id: string } | null }> };
  amount_paid: number;
  billing_reason?: string | null;
}

function idOf(
  value: string | { id: string } | null | undefined
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

function mapSubscriptionStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trial";
    case "canceled":
      return "canceled";
    default:
      // past_due / unpaid / incomplete / incomplete_expired / paused
      return "expired";
  }
}

/**
 * Derive payments.product_type from a coaching product name. There is no clean
 * column mapping (`coaching_products.type` is module/session_pack/one_to_one),
 * so we keyword-match the named services and fall back to the generic
 * `coaching` value rather than mis-tagging. Revisit if à la carte reporting
 * needs finer categories.
 */
function inferProductType(name: string | null): ProductType {
  const n = (name ?? "").toLowerCase();
  if (n.includes("resume")) return "resume_review";
  if (n.includes("linkedin")) return "linkedin_review";
  if (n.includes("interview")) return "interview_prep";
  return "coaching";
}

async function profileEmail(
  supabase: ServiceClient,
  profileId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", profileId)
    .maybeSingle();
  return data?.email ?? null;
}

/**
 * One-time à la carte purchase. Records the payment + grants the coaching
 * enrollment. **Does not change plan** — à la carte never unlocks the board.
 * Subscription checkouts are handled by the subscription / invoice events.
 */
export async function handleCheckoutCompleted(
  supabase: ServiceClient,
  session: MinimalCheckoutSession
): Promise<void> {
  const profileId = session.metadata?.profile_id;
  const kind = session.metadata?.kind;
  const priceId = session.metadata?.price_id ?? null;
  if (!profileId || kind !== "one_time") return;

  const paymentIntentId = idOf(session.payment_intent);

  let productType: ProductType = "coaching";
  let productId: string | null = null;
  if (priceId) {
    const { data: product } = await supabase
      .from("coaching_products")
      .select("id, name")
      .eq("stripe_price_id", priceId)
      .maybeSingle();
    if (product) {
      productId = product.id;
      productType = inferProductType(product.name);
    }
  }

  if (paymentIntentId) {
    const { error } = await supabase.from("payments").insert({
      profile_id: profileId,
      amount: session.amount_total ?? 0,
      product_type: productType,
      status: "succeeded",
      stripe_payment_intent_id: paymentIntentId,
      stripe_price_id: priceId,
      billing_reason: "one_time",
    });
    if (error && !isUniqueViolation(error)) throw error;
  }

  if (productId) {
    await supabase.from("enrollments").insert({
      profile_id: profileId,
      product_id: productId,
      status: "active",
    });
  }

  const email = await profileEmail(supabase, profileId);
  if (email) {
    await fireCandidatePayment({
      email,
      profileId,
      amountCents: session.amount_total ?? 0,
      productType,
      billingReason: "one_time",
    });
  }

  await createNotification(
    {
      profileId,
      type: "payment_succeeded",
      title: "Payment received",
      body: "Your purchase is confirmed.",
      href: "/billing",
      metadata: { productType, billingReason: "one_time" },
    },
    supabase
  );
}

/**
 * Subscription created / updated / deleted. Maps the subscription price to a
 * plan and writes plan + cadence + status. On delete, drops to free. Plan is
 * never downgraded on `cancel_at_period_end` — that only lands when Stripe
 * fires `customer.subscription.deleted` at period end.
 */
export async function handleSubscriptionChange(
  supabase: ServiceClient,
  subscription: MinimalSubscription,
  eventType: string
): Promise<void> {
  const customerId = idOf(subscription.customer);
  if (!customerId) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, plan, email")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (!profile) return;

  if (eventType === "customer.subscription.deleted") {
    await supabase
      .from("profiles")
      .update({
        plan: "free",
        billing_cadence: null,
        subscription_status: "canceled",
      })
      .eq("id", profile.id);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const mapped = priceId ? priceIdToPlan(priceId) : null;
  if (!mapped) return;

  await supabase
    .from("profiles")
    .update({
      plan: mapped.plan,
      billing_cadence: mapped.billingCadence,
      subscription_status: mapSubscriptionStatus(subscription.status),
    })
    .eq("id", profile.id);

  if (profile.email && comparePlans(mapped.plan, profile.plan as Plan) > 0) {
    await fireCandidatePlanUpgraded({
      email: profile.email,
      profileId: profile.id,
      plan: mapped.plan,
      billingCadence: mapped.billingCadence,
    });
  }
}

/** Subscription invoice paid — renewal (and first-cycle) record-keeping. */
export async function handleInvoicePaid(
  supabase: ServiceClient,
  invoice: MinimalInvoice
): Promise<void> {
  const customerId = idOf(invoice.customer);
  const paymentIntentId = idOf(invoice.payment_intent);
  if (!customerId || !paymentIntentId) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (!profile) return;

  const billingReason = invoice.billing_reason ?? "subscription_cycle";
  const { error } = await supabase.from("payments").insert({
    profile_id: profile.id,
    amount: invoice.amount_paid,
    product_type: "subscription",
    status: "succeeded",
    stripe_payment_intent_id: paymentIntentId,
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: idOf(invoice.subscription),
    stripe_price_id: invoice.lines.data[0]?.price?.id ?? null,
    billing_reason: billingReason,
  });
  if (error && !isUniqueViolation(error)) throw error;

  if (profile.email) {
    await fireCandidatePayment({
      email: profile.email,
      profileId: profile.id,
      amountCents: invoice.amount_paid,
      productType: "subscription",
      billingReason,
    });
  }

  await createNotification(
    {
      profileId: profile.id,
      type: "payment_succeeded",
      title: "Payment received",
      body: "Your subscription payment is confirmed.",
      href: "/billing",
      metadata: { productType: "subscription", billingReason },
    },
    supabase
  );
}

/** Subscription invoice failed — mark the account expired. */
export async function handleInvoiceFailed(
  supabase: ServiceClient,
  invoice: MinimalInvoice
): Promise<void> {
  const customerId = idOf(invoice.customer);
  if (!customerId) return;

  await supabase
    .from("profiles")
    .update({ subscription_status: "expired" })
    .eq("stripe_customer_id", customerId);
}
