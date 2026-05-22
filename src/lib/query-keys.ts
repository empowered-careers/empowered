/**
 * Centralized query keys for TanStack Query
 *
 * This file helps prevent cache key chaos by providing a single source of truth
 * for all query keys used throughout the application.
 *
 * Usage:
 * import { queryKeys } from "@/lib/query-keys";
 *
 * // In your query
 * queryKey: queryKeys.user.all
 *
 * // In your mutation invalidation
 * invalidateQueries: [queryKeys.user.all]
 */

export const queryKeys = {
  // User-related queries
  user: {
    all: ["user"] as const,
    profile: (id: string) => ["user", "profile", id] as const,
    settings: (id: string) => ["user", "settings", id] as const,
  },

  // Dashboard data
  dashboard: {
    all: ["dashboard"] as const,
    byUser: (userId: string) => ["dashboard", userId] as const,
  },

  // Resumes
  resumes: {
    all: ["resumes"] as const,
    byUser: (userId: string) => ["resumes", "byUser", userId] as const,
    detail: (id: string) => ["resumes", "detail", id] as const,
  },

  // Posts (example)
  posts: {
    all: ["posts"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["posts", "list", filters] as const,
    detail: (id: string) => ["posts", "detail", id] as const,
    byUser: (userId: string) => ["posts", "byUser", userId] as const,
  },

  // Comments (example)
  comments: {
    all: ["comments"] as const,
    byPost: (postId: string) => ["comments", "byPost", postId] as const,
  },

  // Jobs / job board
  jobs: {
    all: ["jobs"] as const,
    byTier: (tier: string) => ["jobs", "byTier", tier] as const,
    detail: (id: string) => ["jobs", "detail", id] as const,
    saved: (userId: string) => ["jobs", "saved", userId] as const,
  },

  // Candidate preferences (one row per profile)
  preferences: {
    detail: (userId: string) => ["preferences", "detail", userId] as const,
  },

  // Applications (candidate pipeline)
  applications: {
    forUser: (userId: string) => ["applications", "forUser", userId] as const,
    detail: (id: string) => ["applications", "detail", id] as const,
  },

  // Auth-related queries
  auth: {
    session: ["auth", "session"] as const,
    user: ["auth", "user"] as const,
  },

  // Admin console — operator-facing views across all candidates / partners
  admin: {
    candidates: {
      all: ["admin", "candidates"] as const,
      detail: (id: string) => ["admin", "candidates", id] as const,
    },
    applications: {
      all: ["admin", "applications"] as const,
      detail: (id: string) => ["admin", "applications", id] as const,
    },
    placements: {
      all: ["admin", "placements"] as const,
    },
    commissions: {
      all: ["admin", "commissions"] as const,
    },
    payments: {
      all: ["admin", "payments"] as const,
    },
    employers: {
      all: ["admin", "employers"] as const,
      detail: (id: string) => ["admin", "employers", id] as const,
    },
    coaching: {
      all: ["admin", "coaching"] as const,
    },
    events: {
      all: ["admin", "events"] as const,
      detail: (id: string) => ["admin", "events", id] as const,
      registrants: (id: string) =>
        ["admin", "events", id, "registrants"] as const,
    },
    leads: {
      all: ["admin", "leads"] as const,
      list: (filters?: Record<string, unknown>) =>
        ["admin", "leads", "list", filters] as const,
    },
    overview: ["admin", "overview"] as const,
  },

  // Public events surface (marketing acquisition pages).
  events: {
    all: ["events"] as const,
    bySlug: (slug: string) => ["events", "bySlug", slug] as const,
  },
} as const;

// Type helper for query keys
export type QueryKeys = typeof queryKeys;
