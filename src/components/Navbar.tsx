"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-200",
        isScrolled
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-background"
      )}
    >
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="size-10 bg-foreground text-accent flex items-center justify-center font-bold text-xl tracking-tighter">
            EC
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            EMPOWERED CAREERS
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-foreground/80 transition-colors hover:text-accent"
          >
            How It Works
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-foreground/80 transition-colors hover:text-accent"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-foreground/80 transition-colors hover:text-accent"
          >
            Log In
          </Link>
          <Button variant="lime" size="lg" asChild className="h-11 px-6 font-bold">
            <Link href="/login?tab=signup">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Menu Button (simplified for now) */}
        <button
          type="button"
          className="flex size-10 items-center justify-center text-foreground md:hidden"
          aria-label="Open menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="inherit"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
