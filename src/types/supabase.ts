/**
 * Supabase types for the app. Regenerate the schema snapshot with:
 *   npm run supabase:types
 *
 * Do not hand-edit `database.types.ts` — it is produced by the Supabase CLI.
 */

export type {
  CompositeTypes,
  Constants,
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./database.types";

/** Convenience aliases (same as `Database["public"]["Enums"][…]`) */
export type Plan =
  import("./database.types").Database["public"]["Enums"]["plan"];
export type BillingCadence =
  import("./database.types").Database["public"]["Enums"]["billing_cadence"];
export type SubscriptionStatus =
  import("./database.types").Database["public"]["Enums"]["subscription_status"];
export type ProductType =
  import("./database.types").Database["public"]["Enums"]["product_type"];
export type JobStatus =
  import("./database.types").Database["public"]["Enums"]["job_status"];
export type JobTier =
  import("./database.types").Database["public"]["Enums"]["job_tier"];
export type RemotePolicy =
  import("./database.types").Database["public"]["Enums"]["remote_policy"];
export type RelationshipType =
  import("./database.types").Database["public"]["Enums"]["relationship_type"];
export type PaymentStatus =
  import("./database.types").Database["public"]["Enums"]["payment_status"];
export type ApplicationStatus =
  import("./database.types").Database["public"]["Enums"]["application_status"];
export type PlacementStatus =
  import("./database.types").Database["public"]["Enums"]["placement_status"];
export type ReferralStatus =
  import("./database.types").Database["public"]["Enums"]["referral_status"];
export type CoachingProductType =
  import("./database.types").Database["public"]["Enums"]["coaching_product_type"];
export type EnrollmentStatus =
  import("./database.types").Database["public"]["Enums"]["enrollment_status"];
export type CoachingSessionStatus =
  import("./database.types").Database["public"]["Enums"]["coaching_session_status"];
export type CommissionStatus =
  import("./database.types").Database["public"]["Enums"]["commission_status"];
