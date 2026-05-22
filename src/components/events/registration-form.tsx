"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { registerLead } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RegistrationFormProps {
  eventId: string;
  slug: string;
  source: string;
  sourceRef?: string | null;
}

export function RegistrationForm({
  eventId,
  slug,
  source,
  sourceRef,
}: RegistrationFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter your email.");
      return;
    }
    startTransition(async () => {
      const result = await registerLead({
        eventId,
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        source,
        sourceRef: sourceRef ?? null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/events/${slug}/confirmed`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="firstName"
          className="mb-1 block text-[12px] font-medium text-muted-foreground"
        >
          First name
        </label>
        <Input
          id="firstName"
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </div>
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-[12px] font-medium text-muted-foreground"
        >
          Email address
        </label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Registering…" : "Register for free →"}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        We&apos;ll send the join link and a calendar invite to your inbox.
      </p>
    </form>
  );
}
