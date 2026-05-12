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
    list: (filters?: Record<string, any>) =>
      ["posts", "list", filters] as const,
    detail: (id: string) => ["posts", "detail", id] as const,
    byUser: (userId: string) => ["posts", "byUser", userId] as const,
  },

  // Comments (example)
  comments: {
    all: ["comments"] as const,
    byPost: (postId: string) => ["comments", "byPost", postId] as const,
  },

  // Auth-related queries
  auth: {
    session: ["auth", "session"] as const,
    user: ["auth", "user"] as const,
  },
} as const;

// Type helper for query keys
export type QueryKeys = typeof queryKeys;
