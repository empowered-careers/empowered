"use client";

import { CheckCircle, Eye, EyeOff, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

const PASSWORD_MIN = 8;

function StrengthBar({ password }: { password: string }) {
  const checks = [
    password.length >= PASSWORD_MIN,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  const label = ["", "Weak", "Fair", "Good", "Strong"][score];
  const colors = [
    "bg-border",
    "bg-destructive",
    "bg-chart-4",
    "bg-chart-2",
    "bg-accent",
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 transition-colors duration-300 ${
              i <= score ? colors[score] : "bg-border"
            }`}
          />
        ))}
      </div>
      {password.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Strength:{" "}
          <span
            className={`font-medium ${score >= 3 ? "text-foreground" : ""}`}
          >
            {label}
          </span>
        </p>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const { isRecoveryMode, updatePassword, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // If the user isn't in recovery mode and auth has loaded, they don't belong here.
  useEffect(() => {
    if (!authLoading && !isRecoveryMode) {
      // Give a brief moment so the PASSWORD_RECOVERY event can fire client-side.
      const timer = setTimeout(() => {
        if (!isRecoveryMode) {
          // Still not in recovery mode — redirect away.
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [authLoading, isRecoveryMode]);

  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit =
    password.length >= PASSWORD_MIN && password === confirm && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);

    try {
      const { error } = await updatePassword(password);
      if (error) {
        toast.error(error.message);
      } else {
        setIsDone(true);
        toast.success("Password updated!");
        setTimeout(() => router.push("/dashboard"), 2000);
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Invalid access (no recovery session) ── */
  if (!authLoading && !isRecoveryMode && !isDone) {
    return (
      <PageShell>
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1 pb-2 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border border-destructive/40 bg-destructive/5">
                <ShieldAlert
                  className="text-destructive"
                  size={32}
                  strokeWidth={1.5}
                />
              </div>
              <CardTitle className="text-3xl">Link expired</CardTitle>
              <CardDescription className="text-base">
                This password reset link is invalid or has already been used.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Link href="/forgot-password">
                <Button className="w-full" id="btn-request-new-link">
                  Request a new link
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  className="w-full"
                  id="btn-back-to-login-expired"
                  variant="outline"
                >
                  Back to Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  /* ── Success state ── */
  if (isDone) {
    return (
      <PageShell>
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1 pb-2 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border border-border bg-accent/10">
                <CheckCircle
                  className="text-accent"
                  size={32}
                  strokeWidth={1.5}
                />
              </div>
              <CardTitle className="text-3xl">Password updated</CardTitle>
              <CardDescription className="text-base">
                Your new password is set. Redirecting you to your dashboard…
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Link href="/dashboard">
                <Button className="w-full" id="btn-goto-dashboard">
                  Go to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  /* ── Reset form ── */
  return (
    <PageShell>
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-3xl">Set new password</CardTitle>
            <CardDescription>
              Choose a strong password for your account.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* New password */}
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="new-password">
                  New password
                </label>
                <div className="relative">
                  <Input
                    autoComplete="new-password"
                    autoFocus
                    id="new-password"
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={`At least ${PASSWORD_MIN} characters`}
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    type="button"
                  >
                    {showPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
                {password.length > 0 && <StrengthBar password={password} />}
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <label
                  className="font-medium text-sm"
                  htmlFor="confirm-password"
                >
                  Confirm new password
                </label>
                <div className="relative">
                  <Input
                    autoComplete="new-password"
                    id="confirm-password"
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                  />
                  <button
                    aria-label={
                      showConfirm ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    type="button"
                  >
                    {showConfirm ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
                {mismatch && (
                  <p className="text-xs text-destructive">
                    Passwords don&apos;t match
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                disabled={!canSubmit}
                id="btn-update-password"
                type="submit"
              >
                {isLoading ? "Updating…" : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
