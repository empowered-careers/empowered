import { createClient } from "@/lib/supabase/server";
import {
  MY_COACHING_SESSION_COLUMNS,
  type MyCoachingEnrollmentFields,
  type MyCoachingProductFields,
  type MyCoachingSessionFields,
} from "@/types/db";

/**
 * What a candidate owns. `enrollments` is the entitlement source of truth under
 * à la carte — never read `profiles.plan` here (CLAUDE.md rule 2).
 *
 * A bundle purchase writes one enrollment for the bundle itself plus one per
 * contained product, so a bundle owner sees both the bundle and its parts. That
 * is deliberate: the bundle row is the real entitlement, the parts are what they
 * can actually go and do.
 */
export interface MyCoachingItem {
  enrollment: MyCoachingEnrollmentFields;
  product: MyCoachingProductFields;
  /** Sessions booked against this enrollment, soonest first. */
  sessions: MyCoachingSessionFields[];
}

export interface MyCoaching {
  items: MyCoachingItem[];
  /** Every scheduled session across all enrollments, soonest first. */
  upcoming: MyCoachingSessionFields[];
}

const EMPTY: MyCoaching = { items: [], upcoming: [] };

const ENROLLMENT_SELECT =
  "id, product_id, status, progress, granted_at, completed_at, product:coaching_products(id, name, description, kind, external_url, booking_url, coach_id)";

export async function fetchMyCoaching(profileId: string): Promise<MyCoaching> {
  const supabase = await createClient();

  const [{ data: enrollments }, { data: sessions }] = await Promise.all([
    supabase
      .from("enrollments")
      .select(ENROLLMENT_SELECT)
      .eq("profile_id", profileId)
      .order("granted_at", { ascending: false }),
    supabase
      .from("coaching_sessions")
      .select(MY_COACHING_SESSION_COLUMNS)
      .eq("profile_id", profileId)
      .order("scheduled_for", { ascending: true }),
  ]);

  if (!enrollments) return EMPTY;

  const byEnrollment = new Map<string, MyCoachingSessionFields[]>();
  for (const s of sessions ?? []) {
    const list = byEnrollment.get(s.enrollment_id) ?? [];
    list.push(s);
    byEnrollment.set(s.enrollment_id, list);
  }

  const items: MyCoachingItem[] = [];
  for (const row of enrollments) {
    // Supabase types an embedded to-one relation as possibly-array; unwrap it the
    // same way /admin/coaching does.
    const product = (
      Array.isArray(row.product) ? row.product[0] : row.product
    ) as MyCoachingProductFields | null;
    if (!product) continue; // product deleted out from under the enrollment
    items.push({
      enrollment: {
        id: row.id,
        product_id: row.product_id,
        status: row.status,
        progress: row.progress,
        granted_at: row.granted_at,
        completed_at: row.completed_at,
      },
      product,
      sessions: byEnrollment.get(row.id) ?? [],
    });
  }

  return {
    items,
    upcoming: (sessions ?? []).filter((s) => s.status === "scheduled"),
  };
}

/**
 * Does this profile own the given product? Used to gate the course player.
 * Counts an active or completed enrollment — a finished course stays watchable.
 */
export async function hasEnrollment(
  profileId: string,
  productId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select("id")
    .eq("profile_id", profileId)
    .eq("product_id", productId)
    .in("status", ["active", "completed"])
    .maybeSingle();
  return Boolean(data);
}
