"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { auth } from "@/lib/supabase/auth-helpers";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isRecoveryMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  signInWithOAuth: (
    provider: "google" | "linkedin_oidc"
  ) => Promise<{ error: any }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const { user: authUser, error } = await auth.getUser();
      if (error) {
        setUser(null);
      } else {
        setUser(authUser);
      }
    } catch (_error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await auth.signIn(email, password);
    if (!error) {
      await refreshUser();
    }
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await auth.signUp(email, password);
    if (!error) {
      await refreshUser();
    }
    return { error };
  };

  const signOut = async () => {
    const { error } = await auth.signOut();
    if (!error) {
      setUser(null);
      setIsRecoveryMode(false);
    }
    return { error };
  };

  const signInWithOAuth = async (provider: "google" | "linkedin_oidc") => {
    const { error } = await auth.signInWithOAuth(provider);
    return { error };
  };

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await auth.resetPasswordForEmail(email);
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await auth.updatePassword(password);
    if (!error) {
      setIsRecoveryMode(false);
      await refreshUser();
    }
    return { error };
  };

  useEffect(() => {
    // Initial user fetch
    refreshUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setUser(session?.user ?? null);
        setIsRecoveryMode(false);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setIsRecoveryMode(false);
      } else if (event === "PASSWORD_RECOVERY") {
        // User clicked the reset link — flag recovery mode so /reset-password
        // can gate access and show the form immediately.
        setUser(session?.user ?? null);
        setIsRecoveryMode(true);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  const value = {
    user,
    isLoading,
    isRecoveryMode,
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
    resetPasswordForEmail,
    updatePassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
