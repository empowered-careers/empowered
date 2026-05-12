"use client";

import { CheckCircle, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { resetPasswordForEmail } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await resetPasswordForEmail(email);
      if (error) {
        toast.error(error.message);
      } else {
        setIsSubmitted(true);
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell>
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md">
          {isSubmitted ? (
            /* ── Success state ── */
            <>
              <CardHeader className="space-y-1 pb-2 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border border-border bg-accent/10">
                  <CheckCircle
                    className="text-accent"
                    size={32}
                    strokeWidth={1.5}
                  />
                </div>
                <CardTitle className="text-3xl">Check your inbox</CardTitle>
                <CardDescription className="text-base">
                  We&apos;ve sent a password reset link to{" "}
                  <strong className="text-foreground">{email}</strong>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 pt-4">
                <div className="space-y-3 border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Mail className="mt-0.5 shrink-0" size={15} />
                    <p>
                      Click the link in the email to set a new password. The
                      link expires in{" "}
                      <span className="font-medium text-foreground">
                        1 hour
                      </span>
                      .
                    </p>
                  </div>
                  <p className="pl-[23px]">
                    Didn&apos;t receive it? Check your spam folder or{" "}
                    <button
                      className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                      onClick={() => {
                        setIsSubmitted(false);
                        setEmail("");
                      }}
                      type="button"
                    >
                      try a different email
                    </button>
                    .
                  </p>
                </div>

                <Link href="/login">
                  <Button className="w-full" variant="outline">
                    Back to Sign In
                  </Button>
                </Link>
              </CardContent>
            </>
          ) : (
            /* ── Request form ── */
            <>
              <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-3xl">Forgot password?</CardTitle>
                <CardDescription>
                  Enter the email address linked to your account and we&apos;ll
                  send you a reset link.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <label
                      className="font-medium text-sm"
                      htmlFor="forgot-email"
                    >
                      Email
                    </label>
                    <Input
                      autoComplete="email"
                      autoFocus
                      id="forgot-email"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      type="email"
                      value={email}
                    />
                  </div>

                  <Button
                    className="w-full"
                    disabled={isLoading}
                    id="btn-send-reset-link"
                    type="submit"
                  >
                    {isLoading ? "Sending link…" : "Send Reset Link"}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                  Remembered your password?{" "}
                  <Link
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                    href="/login"
                    id="link-back-to-signin"
                  >
                    Sign in
                  </Link>
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
