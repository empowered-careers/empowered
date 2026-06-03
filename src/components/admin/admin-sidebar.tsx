"use client";

import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Receipt,
  Send,
  Sparkles,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type AdminNavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
};

type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

const adminNav: AdminNavSection[] = [
  {
    label: "Overview",
    items: [{ icon: LayoutDashboard, label: "Overview", href: "/admin" }],
  },
  {
    label: "Pipeline",
    items: [
      { icon: Briefcase, label: "Jobs", href: "/admin/jobs" },
      { icon: Users, label: "Candidates", href: "/admin/candidates" },
      { icon: Wallet, label: "Payments", href: "/admin/payments" },
    ],
  },
  {
    label: "Growth",
    items: [
      { icon: CalendarDays, label: "Events", href: "/admin/events" },
      { icon: Sparkles, label: "Leads", href: "/admin/leads" },
    ],
  },
  {
    label: "Placements",
    items: [
      { icon: Send, label: "Applications", href: "/admin/applications" },
      { icon: Trophy, label: "Placements", href: "/admin/placements" },
    ],
  },
  {
    label: "Partners",
    items: [
      { icon: Receipt, label: "Commissions", href: "/admin/commissions" },
      { icon: Building2, label: "Employers", href: "/admin/employers" },
      { icon: GraduationCap, label: "Coaching", href: "/admin/coaching" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-card">
      <nav className="flex flex-col gap-6 px-3 py-6">
        {adminNav.map((section) => (
          <div key={section.label} className="flex flex-col gap-1">
            <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
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
