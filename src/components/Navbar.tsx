"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            href="/events"
            className="text-sm font-medium text-foreground/80 transition-colors hover:text-accent"
          >
            Events
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
          <Button
            variant="lime"
            size="lg"
            asChild
            className="h-11 px-6 font-bold"
          >
            <Link href="/login?tab=signup">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="flex size-10 items-center justify-center text-foreground md:hidden"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {isMenuOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-4">
            <Link
              href="#how-it-works"
              onClick={() => setIsMenuOpen(false)}
              className="py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-accent"
            >
              How It Works
            </Link>
            <Link
              href="/events"
              onClick={() => setIsMenuOpen(false)}
              className="py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-accent"
            >
              Events
            </Link>
            <Link
              href="#pricing"
              onClick={() => setIsMenuOpen(false)}
              className="py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-accent"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              onClick={() => setIsMenuOpen(false)}
              className="py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-accent"
            >
              Log In
            </Link>
            <Button
              variant="lime"
              size="lg"
              asChild
              className="mt-2 h-11 px-6 font-bold"
            >
              <Link
                href="/login?tab=signup"
                onClick={() => setIsMenuOpen(false)}
              >
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
