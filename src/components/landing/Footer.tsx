import Link from "next/link";

import { siteConfig } from "@/config/site";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background pt-20 pb-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-20">
          {/* Logo & Info */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-6 group">
              <div className="size-8 bg-foreground text-accent flex items-center justify-center font-bold text-lg tracking-tighter">
                EC
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                EMPOWERED
              </span>
            </Link>
            <p className="font-sans text-sm text-foreground/40 leading-relaxed max-w-[220px]">
              Resume scoring and career coaching from a real recruiter.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-foreground mb-6">
              Product
            </h4>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/#how-it-works"
                  className="font-sans text-sm text-foreground/60 hover:text-foreground"
                >
                  How it works
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="font-sans text-sm text-foreground/60 hover:text-foreground"
                >
                  Coaching
                </Link>
              </li>
              <li>
                <Link
                  href="/events"
                  className="font-sans text-sm text-foreground/60 hover:text-foreground"
                >
                  Events
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="font-sans text-sm text-foreground/60 hover:text-foreground"
                >
                  Log in
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-foreground mb-6">
              Company
            </h4>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/#lauren"
                  className="font-sans text-sm text-foreground/60 hover:text-foreground"
                >
                  About Lauren
                </Link>
              </li>
              <li>
                <a
                  href="mailto:Lauren@empowered-careers.com"
                  className="font-sans text-sm text-foreground/60 hover:text-foreground"
                >
                  Contact
                </a>
              </li>
              <li>
                <Link
                  href="#"
                  className="font-sans text-sm text-foreground/60 hover:text-foreground"
                >
                  LinkedIn
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-foreground mb-6">
              Legal
            </h4>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/privacy"
                  className="font-sans text-sm text-foreground/60 hover:text-foreground"
                >
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="font-sans text-sm text-foreground/60 hover:text-foreground"
                >
                  Terms of service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-12">
          <p className="font-sans text-xs text-foreground/30">
            © {currentYear} {siteConfig.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
