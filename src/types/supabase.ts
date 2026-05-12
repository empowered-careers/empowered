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
export type SubscriptionTier = import("./database.types").Database["public"]["Enums"]["subscription_tier"];
export type SubscriptionStatus = import("./database.types").Database["public"]["Enums"]["subscription_status"];
export type ProductType = import("./database.types").Database["public"]["Enums"]["product_type"];
export type JobStatus = import("./database.types").Database["public"]["Enums"]["job_status"];
export type RemotePolicy = import("./database.types").Database["public"]["Enums"]["remote_policy"];
export type RelationshipType = import("./database.types").Database["public"]["Enums"]["relationship_type"];
export type PaymentStatus = import("./database.types").Database["public"]["Enums"]["payment_status"];
