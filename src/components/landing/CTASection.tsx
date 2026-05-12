"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="bg-background py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden bg-foreground p-12 text-center text-background md:p-24">
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 z-0 opacity-[0.05]" style={{ 
            backgroundImage: `linear-gradient(var(--background) 1px, transparent 1px), linear-gradient(90deg, var(--background) 1px, transparent 1px)`,
            backgroundSize: '30px 30px'
          }} />
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="mb-8 font-display text-4xl font-bold text-background md:text-6xl">
              Ready to Access Hidden Opportunities?
            </h2>
            <p className="mb-12 font-sans text-xl text-background/70">
              Join the private network that top engineering leaders use to skip the job board noise.
            </p>
            
            <div className="flex flex-col items-center gap-6">
              <Button variant="lime" size="lg" className="h-16 px-12 text-xl font-bold" asChild>
                <Link href="/login?tab=signup">Get Started — Free</Link>
              </Button>
              <p className="font-sans text-xs font-semibold uppercase tracking-wide text-background/50">
                No credit card required. Instant resume score.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
