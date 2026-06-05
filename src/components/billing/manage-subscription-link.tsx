"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** Opens the Stripe Customer Portal (hosted cancel/update UX). */
export function ManageSubscriptionLink({
  label = "Manage subscription",
  variant = "outline",
}: {
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
} = {}) {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Could not open the billing portal.");
        setLoading(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      toast.error("Could not open the billing portal.");
      setLoading(false);
    }
  }

  return (
    <Button disabled={loading} onClick={openPortal} variant={variant}>
      {loading ? "Opening…" : label}
    </Button>
  );
}
