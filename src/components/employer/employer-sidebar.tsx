"use client";

import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Building2,
  LayoutDashboard,
  Send,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { RelationshipType } from "@/types/db";

type EmployerNavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
};

type EmployerNavSection = {
  label: string;
  items: EmployerNavItem[];
};

function buildNav(
  relationshipType: RelationshipType | null
): EmployerNavSection[] {
  const sections: EmployerNavSection[] = [
    {
      label: "Overview",
      items: [{ icon: LayoutDashboard, label: "Overview", href: "/employer" }],
    },
    {
      label: "Hiring",
      items: [
        { icon: Briefcase, label: "Roles", href: "/employer/jobs" },
        { icon: Send, label: "Candidates", href: "/employer/applications" },
      ],
    },
  ];

  if (relationshipType === "agency_partner") {
    sections.push({
      label: "Agency",
      items: [{ icon: Building2, label: "Clients", href: "/employer/clients" }],
    });
  }

  sections.push({
    label: "Outcomes",
    items: [
      { icon: Trophy, label: "Placements", href: "/employer/placements" },
    ],
  });

  return sections;
}

export function EmployerSidebar({
  relationshipType,
}: {
  relationshipType: RelationshipType | null;
}) {
  const pathname = usePathname();
  const nav = buildNav(relationshipType);

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-card">
      <nav className="flex flex-col gap-6 px-3 py-6">
        {nav.map((section) => (
          <div key={section.label} className="flex flex-col gap-1">
            <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active =
                item.href === "/employer"
                  ? pathname === "/employer"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
