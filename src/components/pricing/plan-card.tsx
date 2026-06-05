"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PlanCardOption {
  label: string;
  priceId: string | undefined;
  amount: string | null;
}

export function PlanCard({
  id,
  name,
  blurb,
  features,
  options,
  highlighted,
  isAuthed,
  isFree,
}: {
  id: string;
  name: string;
  blurb: string;
  features: string[];
  options: PlanCardOption[];
  highlighted?: boolean;
  isAuthed: boolean;
  isFree?: boolean;
}) {
  const [loadingPrice, setLoadingPrice] = useState<string | null>(null);

  async function startCheckout(priceId: string) {
    if (!isAuthed) {
      window.location.assign("/login?next=/pricing");
      return;
    }
    setLoadingPrice(priceId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Could not start checkout.");
        setLoadingPrice(null);
        return;
      }
      window.location.assign(data.url);
    } catch {
      toast.error("Could not start checkout.");
      setLoadingPrice(null);
    }
  }

  return (
    <div
      id={id}
      className={cn(
        "flex scroll-mt-24 flex-col border bg-card p-6",
        highlighted ? "border-accent" : "border-border"
      )}
    >
      <h3 className="font-display text-xl font-medium text-foreground">
        {name}
      </h3>
      <p className="mt-1 text-[13px] text-muted-foreground">{blurb}</p>

      <ul className="mt-5 flex flex-1 flex-col gap-2 text-[13px]">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-2">
        {isFree ? (
          <Button asChild variant="outline">
            <a href="/login?next=/dashboard">Get started free</a>
          </Button>
        ) : (
          options.map((o) => (
            <Button
              key={o.label}
              disabled={!o.priceId || loadingPrice === o.priceId}
              onClick={() => o.priceId && startCheckout(o.priceId)}
              variant={highlighted ? "default" : "outline"}
            >
              {loadingPrice === o.priceId
                ? "Redirecting…"
                : o.priceId
                  ? `${o.label}${o.amount ? ` — ${o.amount}` : ""}`
                  : `${o.label} — unavailable`}
            </Button>
          ))
        )}
      </div>
    </div>
  );
}
