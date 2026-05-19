"use client";

import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  resolveTabKey,
  topNavTabs,
} from "@/components/app-shell/sidebar-config";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface TopNavProps {
  pathname: string;
  userName: string;
  userEmail: string;
}

function initials(name: string, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@]/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return letters.join("") || "U";
}

export function TopNav({ pathname, userName, userEmail }: TopNavProps) {
  const activeKey = resolveTabKey(pathname);
  const { signOut } = useAuth();
  const router = useRouter();

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
    <nav className="sticky top-0 z-20 flex h-14 items-center border-border border-b bg-background px-6">
      <Link
        className="mr-8 font-display font-medium text-[17px] tracking-tight"
        href="/dashboard"
      >
        empowered<span className="text-accent">.</span>
      </Link>

      <div className="flex flex-1 items-center gap-1">
        {topNavTabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <Link
              className={cn(
                "px-3.5 py-2 font-medium text-[13.5px] transition-colors",
                isActive
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              )}
              href={tab.href}
              key={tab.key}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          aria-label="Open search"
          className="flex min-w-[180px] items-center gap-2 border border-transparent bg-card px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-border"
          type="button"
        >
          <Search className="size-3.5" />
          <span>Search</span>
          <span className="ml-auto border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            ⌘K
          </span>
        </button>

        <ThemeToggle />

        <Button
          aria-label="Notifications"
          className="h-9 w-9"
          size="icon"
          type="button"
          variant="ghost"
        >
          <Bell className="size-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Profile menu"
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
              <span className="font-medium text-sm">
                {userName || "Member"}
              </span>
              <span className="font-normal text-muted-foreground text-xs">
                {userEmail}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
