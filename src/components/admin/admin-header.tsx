"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminHeaderProps {
  userName: string;
  userEmail: string;
}

/** Maps the second path segment (`/admin/<segment>`) to a display label. */
const SECTION_LABELS: Record<string, string> = {
  jobs: "Jobs",
  candidates: "Candidates",
  payments: "Payments",
  events: "Events",
  leads: "Leads",
  applications: "Applications",
  placements: "Placements",
  commissions: "Commissions",
  employers: "Employers",
  coaching: "Coaching",
};

function initials(name: string, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@]/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return letters.join("") || "A";
}

/**
 * Thin admin top bar: branding + current section, a "View public site" link so
 * the admin can preview live marketing changes in a new tab, and the account
 * menu (the only sign-out affordance inside /admin).
 */
export function AdminHeader({ userName, userEmail }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const segment = pathname.split("/")[2];
  const section = segment ? (SECTION_LABELS[segment] ?? "Admin") : "Overview";

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed out successfully");
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-border border-b bg-background px-6">
      <Link className="flex items-center gap-2" href="/admin">
        <span className="flex size-8 items-center justify-center bg-foreground font-bold text-[13px] text-accent tracking-tighter">
          EC
        </span>
        <span className="font-display font-medium text-[15px] tracking-tight">
          Admin
        </span>
      </Link>

      <span className="text-muted-foreground text-sm">/ {section}</span>

      <div className="ml-auto flex items-center gap-2">
        <a
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-accent/50 hover:text-foreground"
          href="/"
          rel="noreferrer"
          target="_blank"
        >
          View public site
          <ExternalLink className="size-3.5" />
        </a>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Account menu"
              className="flex items-center"
              type="button"
            >
              <Avatar className="size-8 bg-accent text-accent-foreground">
                <AvatarFallback className="bg-accent font-semibold text-[12px] text-accent-foreground">
                  {initials(userName, userEmail)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{userName || "Admin"}</span>
              <span className="font-normal text-muted-foreground text-xs">
                {userEmail}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard">Candidate dashboard</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
