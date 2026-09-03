"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";

import { redeemInviteCode } from "@/app/actions/invite";
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

interface InviteClientProps {
  /** False when BETA_INVITE_CODE is unset — then buying is the only way in. */
  codeRedeemable: boolean;
}

export function InviteClient({ codeRedeemable }: InviteClientProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await redeemInviteCode(code);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      toast.success("Welcome to the beta!");
      // refresh() first so the layout re-runs its gate check against the new
      // enrollment — otherwise the cached RSC payload bounces us back here.
      router.refresh();
      router.replace("/dashboard");
    });
  };

  return (
    <PageShell>
      <div className="flex justify-center pt-16">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-3xl">Private Beta</CardTitle>
            <CardDescription>
              {codeRedeemable
                ? "Empowered Careers is in private beta. Enter the invite code from your email to continue."
                : "Empowered Careers is in private beta. Access comes with your first purchase."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {codeRedeemable ? (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                  autoFocus
                  aria-label="Invite code"
                  autoCapitalize="characters"
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
            ) : null}
            <p className="text-center text-muted-foreground text-sm">
              {codeRedeemable ? "No code? " : null}
              <Link className="underline" href="/pricing">
                See what&apos;s available
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
