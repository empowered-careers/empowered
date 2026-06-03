"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

interface EmployerHeaderProps {
  companyName: string | null;
  userName: string;
  userEmail: string;
  isAdminViewer: boolean;
}

function initials(name: string, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@]/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return letters.join("") || "E";
}

/**
 * Thin employer top bar: branding + the employer's company name as context, and
 * the account menu (the only sign-out affordance inside /employer). When Lauren
 * is impersonating via role=admin, the menu also links back to /admin.
 */
export function EmployerHeader({
  companyName,
  userName,
  userEmail,
  isAdminViewer,
}: EmployerHeaderProps) {
  const router = useRouter();
  const { signOut } = useAuth();

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
      <Link className="flex items-center gap-2" href="/employer">
        <span className="flex size-8 items-center justify-center bg-foreground font-bold text-[13px] text-accent tracking-tighter">
          EC
        </span>
        <span className="font-display font-medium text-[15px] tracking-tight">
          {companyName ?? "Employer"}
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-2">
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
              <span className="font-medium text-sm">
                {userName || "Employer"}
              </span>
              <span className="font-normal text-muted-foreground text-xs">
                {userEmail}
              </span>
            </DropdownMenuLabel>
            {isAdminViewer && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin">Admin console</Link>
                </DropdownMenuItem>
              </>
            )}
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
