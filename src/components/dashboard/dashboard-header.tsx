"use client";

import { useSyncExternalStore } from "react";

import type { DashboardProfile } from "@/hooks/use-dashboard-data";

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

// Stable no-op subscription — the greeting never needs to push updates.
const emptySubscribe = () => () => {};

export function DashboardHeader({ profile, userEmail }: DashboardHeaderProps) {
  const displayName = getDisplayName(profile, userEmail);

  // Hydration-safe time-of-day greeting. Computing it during render
  // hydration-mismatches whenever the server's UTC hour falls in a different
  // greeting bucket than the visitor's local hour (React #418 — the error
  // boundary then swallows the whole dashboard). The server snapshot renders
  // "Hello" on the server AND the hydration pass, then React re-reads the
  // client snapshot for the visitor's local-time greeting.
  const greeting = useSyncExternalStore(
    emptySubscribe,
    getGreeting,
    () => "Hello"
  );

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
    </div>
  );
}
