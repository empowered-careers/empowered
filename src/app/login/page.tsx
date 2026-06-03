"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/page-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

/** Google "G" monogram SVG */
function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      height="18"
      viewBox="0 0 18 18"
      width="18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

/** LinkedIn "in" monogram SVG */
function LinkedInIcon() {
  return (
    <svg
      aria-hidden="true"
      height="18"
      viewBox="0 0 18 18"
      width="18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#0A66C2" height="18" rx="2" width="18" />
      <path
        d="M4.5 7.25h2V13h-2V7.25Zm1-3.25a1.125 1.125 0 1 1 0 2.25A1.125 1.125 0 0 1 5.5 4Zm3 3.25h1.918v.805h.027C10.74 7.594 11.5 7 12.625 7 14.75 7 15 8.36 15 10.125V13h-2v-2.438c0-.78-.014-1.782-1.085-1.782-1.087 0-1.253.85-1.253 1.727V13h-2V7.25Z"
        fill="#fff"
      />
    </svg>
  );
}

function AuthForm() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<
    "google" | "linkedin_oidc" | null
  >(null);

  const { signIn, signUp, signInWithOAuth } = useAuth();
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } =
        mode === "signin"
          ? await signIn(email, password)
          : await signUp(email, password);

      if (error) {
        toast.error(error.message);
      } else if (mode === "signup") {
        toast.success("Account created successfully!");
        router.push("/dashboard");
      } else {
        toast.success("Signed in successfully!");
        // Admins land on the console; everyone else on the candidate dashboard.
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        let destination = "/dashboard";
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
          if (profile?.role === "admin") destination = "/admin";
        }
        router.push(destination);
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "linkedin_oidc") => {
    setOauthLoading(provider);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) {
        toast.error(error.message);
        setOauthLoading(null);
      }
    } catch {
      toast.error("An unexpected error occurred");
      setOauthLoading(null);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-3xl">
          {mode === "signin" ? "Sign In" : "Sign Up"}
        </CardTitle>
        <CardDescription>
          {mode === "signin"
            ? "Access your Empowered Careers account"
            : "Create your Empowered Careers account to get started"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Social auth buttons ── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            className="social-btn group"
            disabled={oauthLoading !== null || isLoading}
            id="btn-google-signin"
            onClick={() => handleOAuth("google")}
            type="button"
          >
            <GoogleIcon />
            <span>{oauthLoading === "google" ? "Redirecting…" : "Google"}</span>
          </button>

          <button
            className="social-btn group"
            disabled={oauthLoading !== null || isLoading}
            id="btn-linkedin-signin"
            onClick={() => handleOAuth("linkedin_oidc")}
            type="button"
          >
            <LinkedInIcon />
            <span>
              {oauthLoading === "linkedin_oidc" ? "Redirecting…" : "LinkedIn"}
            </span>
          </button>
        </div>

        {/* ── Divider ── */}
        <div className="relative flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="shrink-0 text-xs uppercase tracking-widest text-muted-foreground">
            or continue with email
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* ── Email / password form ── */}
        <form className="space-y-4" onSubmit={handleAuth}>
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-sm" htmlFor="password">
                Password
              </label>
              {mode === "signin" && (
                <Link
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  href="/forgot-password"
                  id="link-forgot-password"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <Input
              id="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                mode === "signin"
                  ? "Enter your password"
                  : "Create a secure password"
              }
              required
              type="password"
              value={password}
            />
          </div>

          <Button
            className="w-full"
            disabled={isLoading || oauthLoading !== null}
            id="btn-auth-submit"
            type="submit"
          >
            {isLoading
              ? mode === "signin"
                ? "Signing in…"
                : "Creating account…"
              : mode === "signin"
                ? "Sign In"
                : "Sign Up"}
          </Button>
        </form>

        <div className="text-center text-sm">
          {mode === "signin" ? (
            <>
              Don't have an account?{" "}
              <button
                className="font-medium text-primary hover:underline"
                onClick={() => setMode("signup")}
                type="button"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                className="font-medium text-primary hover:underline"
                onClick={() => setMode("signin")}
                type="button"
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <PageShell>
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <Suspense
          fallback={<div className="text-muted-foreground">Loading...</div>}
        >
          <AuthForm />
        </Suspense>
      </div>

      <style>{`
        .social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--foreground);
          font-family: var(--font-body);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          width: 100%;
        }
        .social-btn:hover:not(:disabled) {
          background: var(--muted);
          border-color: var(--foreground);
        }
        .social-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </PageShell>
  );
}
