import { createClient as createBrowserClient } from "./client";
import { createClient as createServerClient } from "./server";

// Client-side auth helpers
export const auth = {
  async signIn(email: string, password: string) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signUp(email: string, password: string) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getUser() {
    const supabase = createBrowserClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return { user, error };
  },

  async getSession() {
    const supabase = createBrowserClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    return { session, error };
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    const supabase = createBrowserClient();
    return supabase.auth.onAuthStateChange(callback);
  },

  /**
   * Initiate OAuth sign-in with Google or LinkedIn.
   * Supabase will redirect to the provider, then back to /auth/callback.
   */
  async signInWithOAuth(provider: "google" | "linkedin_oidc") {
    const supabase = createBrowserClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });
    return { data, error };
  },

  /**
   * Send a password-reset email.
   * The email link will redirect to /auth/callback?type=recovery which
   * then redirects to /reset-password.
   */
  async resetPasswordForEmail(email: string) {
    const supabase = createBrowserClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?type=recovery`,
    });
    return { data, error };
  },

  /**
   * Update the authenticated user's password.
   * Only works when the user has an active recovery session (arrived via reset link).
   */
  async updatePassword(password: string) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.auth.updateUser({ password });
    return { data, error };
  },
};

// Server-side auth helpers
export const serverAuth = {
  async getUser() {
    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return { user, error };
  },

  async getSession() {
    const supabase = await createServerClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    return { session, error };
  },
};
