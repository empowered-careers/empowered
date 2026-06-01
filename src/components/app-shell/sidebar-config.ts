import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Bell,
  BookOpen,
  Calendar,
  Check,
  Circle,
  Columns3,
  Compass,
  FileText,
  Layers,
  Link as LinkIcon,
  List,
  Lock,
  Play,
  Search,
  Send,
  Star,
  Target,
  User,
  Users,
  Wallet,
} from "lucide-react";

export type SidebarItem = {
  icon: LucideIcon;
  label: string;
  href?: string;
  meta?: string;
  children?: SidebarItem[];
};

export type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

/**
 * Contextual sidebar per top-nav tab. Keyed by pathname prefix.
 * Mirrors the structure in docs/prototypes/ec-ui-mock.html and the spec
 * in docs/ec-ui-plan.md.
 */
export const sidebarConfig: Record<string, SidebarSection[]> = {
  "/dashboard": [
    {
      label: "Profile",
      items: [
        { icon: User, label: "My Profile", href: "/profile" },
        { icon: FileText, label: "Resume", href: "/resume" },
        {
          icon: List,
          label: "Assessments",
          href: "/assessments",
          children: [
            {
              icon: Compass,
              label: "Career Identity Blueprint",
              href: "/assessments/ci-blueprint",
            },
          ],
        },
        { icon: LinkIcon, label: "LinkedIn Grade", href: "/linkedin" },
      ],
    },
    {
      label: "Account",
      items: [
        { icon: Wallet, label: "Billing" },
        { icon: Bell, label: "Notifications" },
      ],
    },
  ],
  "/pipeline": [
    {
      label: "Pipeline",
      items: [
        { icon: Target, label: "Matched roles", href: "/pipeline" },
        { icon: Send, label: "Applied" },
        { icon: Star, label: "Saved" },
        { icon: Archive, label: "Archived" },
      ],
    },
    {
      label: "View",
      items: [
        { icon: Columns3, label: "Kanban" },
        { icon: List, label: "List" },
      ],
    },
  ],
  "/job-board": [
    {
      label: "Job tiers",
      items: [
        { icon: Layers, label: "All roles", href: "/job-board" },
        { icon: Circle, label: "Tier 1 · Curated" },
        { icon: Circle, label: "Tier 2 · Semi-exclusive" },
        { icon: Lock, label: "Tier 3 · Exclusive" },
      ],
    },
    {
      label: "Saved",
      items: [
        { icon: Star, label: "Saved roles", href: "/job-board/saved" },
        { icon: Search, label: "Saved searches" },
      ],
    },
  ],
  "/content": [
    {
      label: "Library",
      items: [
        { icon: FileText, label: "Articles", href: "/content" },
        { icon: Play, label: "Videos" },
        { icon: BookOpen, label: "Courses" },
        { icon: Users, label: "Coaching" },
      ],
    },
    {
      label: "Live",
      items: [
        { icon: Calendar, label: "Upcoming events" },
        { icon: Check, label: "Past events" },
      ],
    },
  ],
};

export type TabKey = keyof typeof sidebarConfig;

export const topNavTabs: { key: string; label: string; href: string }[] = [
  { key: "/dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "/pipeline", label: "Pipeline", href: "/pipeline" },
  { key: "/job-board", label: "Job Board", href: "/job-board" },
  { key: "/content", label: "Content & Courses", href: "/content" },
];

export function resolveTabKey(pathname: string): string {
  // Resume + LinkedIn + Profile + Onboarding + Assessments live under the
  // Dashboard tab. /assessments (plural index) is matched by /assessment prefix.
  if (
    pathname.startsWith("/resume") ||
    pathname.startsWith("/linkedin") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/assessment")
  ) {
    return "/dashboard";
  }
  const match = topNavTabs.find((t) => pathname.startsWith(t.key));
  return match?.key ?? "/dashboard";
}
