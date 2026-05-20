"use client";

import { usePathname } from "next/navigation";

import { ContextualSidebar } from "@/components/app-shell/contextual-sidebar";
import { TopNav } from "@/components/app-shell/top-nav";
import { TooltipProvider } from "@/components/ui/tooltip";

export interface AppShellProps {
  userName: string;
  userEmail: string;
  /** 0–100 — profile completeness for the pinned chip */
  completeness: number;
  /** e.g. "Plan 2 · Senior PM" */
  subline?: string;
  /** When true, surface the Admin entry in the top-nav profile menu. */
  isAdmin?: boolean;
  children: React.ReactNode;
}

export function AppShell({
  userName,
  userEmail,
  completeness,
  subline,
  isAdmin,
  children,
}: AppShellProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={200}>
      <TopNav
        isAdmin={isAdmin}
        pathname={pathname}
        userEmail={userEmail}
        userName={userName}
      />
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <ContextualSidebar
          completeness={completeness}
          pathname={pathname}
          subline={subline}
          userName={userName}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </TooltipProvider>
  );
}
