"use client";

import Link from "next/link";

import { ProfileChip } from "@/components/app-shell/profile-chip";
import {
  resolveTabKey,
  sidebarConfig,
} from "@/components/app-shell/sidebar-config";
import { cn } from "@/lib/utils";

export interface ContextualSidebarProps {
  pathname: string;
  userName: string;
  completeness: number;
  subline?: string;
}

export function ContextualSidebar({
  pathname,
  userName,
  completeness,
  subline,
}: ContextualSidebarProps) {
  const tabKey = resolveTabKey(pathname);
  const sections = sidebarConfig[tabKey] ?? [];

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[248px] shrink-0 flex-col border-border border-r bg-background px-3 pt-5 pb-3 md:flex">
      <div className="flex-1 overflow-y-auto">
        {sections.map((section) => (
          <div className="mb-4 flex flex-col gap-px" key={section.label}>
            <div className="px-2.5 pb-2 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.08em]">
              {section.label}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.href && pathname === item.href;
              const content = (
                <span
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 px-2.5 py-1.5 text-[13px] transition-colors",
                    isActive
                      ? "bg-card text-foreground"
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      isActive ? "text-accent" : "text-muted-foreground"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.meta ? (
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {item.meta}
                    </span>
                  ) : null}
                </span>
              );
              return item.href ? (
                <Link href={item.href} key={item.label}>
                  {content}
                </Link>
              ) : (
                <div key={item.label}>{content}</div>
              );
            })}
          </div>
        ))}
      </div>

      <ProfileChip
        completeness={completeness}
        name={userName}
        subline={subline}
      />
    </aside>
  );
}
