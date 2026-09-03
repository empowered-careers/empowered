"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";

import { verifyInviteCode } from "@/app/actions/invite";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function InviteClient() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await verifyInviteCode(code);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      toast.success("Welcome to the beta!");
      router.replace("/dashboard");
      router.refresh();
    });
  };

  return (
    <PageShell>
      <div className="flex justify-center pt-16">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-3xl">Private Beta</CardTitle>
            <CardDescription>
              Empowered Careers is in private beta. Enter the invite code from
              your email to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                autoFocus
                aria-label="Invite code"
                disabled={isPending}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Invite code"
                value={code}
              />
              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : null}
              <Button
                className="w-full"
                disabled={isPending || code.trim().length === 0}
                type="submit"
              >
                {isPending ? "Checking…" : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
