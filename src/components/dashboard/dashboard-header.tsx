"use client";

import { Crown, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DashboardProfile } from "@/hooks/use-dashboard-data";
import { isPaidUser } from "@/hooks/use-dashboard-data";

interface DashboardHeaderProps {
  profile: DashboardProfile | null;
  userEmail?: string;
}

function getDisplayName(
  profile: DashboardProfile | null,
  email?: string
): string {
  if (profile?.full_name) {
    // Return first name only for a warmer greeting
    return profile.full_name.split(" ")[0];
  }
  if (email) {
    return email.split("@")[0];
  }
  return "there";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardHeader({ profile, userEmail }: DashboardHeaderProps) {
  const displayName = getDisplayName(profile, userEmail);
  const greeting = getGreeting();
  const paid = isPaidUser(profile);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      {/* Greeting */}
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          {greeting}
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight text-foreground lg:text-5xl">
          Welcome back, {displayName}
          <span className="text-accent">.</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Your career momentum dashboard
        </p>
      </div>

      {/* Subscription badge */}
      <div className="flex-shrink-0 pt-1">
        {paid ? (
          <Badge
            id="subscription-badge-paid"
            className="gap-1.5 border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground"
            variant="outline"
          >
            <Crown className="h-3.5 w-3.5 text-accent" />
            Paid Member
          </Badge>
        ) : (
          <Badge
            id="subscription-badge-free"
            className="gap-1.5 border-border bg-muted px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            variant="outline"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Free Plan
          </Badge>
        )}
      </div>
    </div>
  );
}
