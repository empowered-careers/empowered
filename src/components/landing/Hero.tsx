"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background pt-20 pb-32 md:pt-32 md:pb-48">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ 
        backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      <div className="container relative z-10 mx-auto px-4">
        <div className="max-w-4xl">
          <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight text-foreground mb-8">
            Access Exclusive Tech Roles <br className="hidden md:block" />
            That Never Hit Job Boards
          </h1>
          
          <p className="font-sans text-xl md:text-2xl text-foreground/60 max-w-2xl mb-12 leading-relaxed">
            Get assessed. Get matched. Get hired. The private talent network for mid-to-senior tech professionals.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="lime" size="lg" className="h-14 px-10 text-lg font-bold" asChild>
              <Link href="/login?tab=signup">Get Your Free Resume Score</Link>
            </Button>
            <Button variant="outline" size="lg" className="h-14 px-10 text-lg font-bold border-2" asChild>
              <Link href="#how-it-works">How It Works</Link>
            </Button>
          </div>
          
          {/* Visual Element: Abstract Grid/Preview */}
          <div className="mt-20 relative">
            <div className="absolute -inset-4 bg-accent/10 -z-10 blur-3xl opacity-50" />
            <div className="relative border border-foreground/10 bg-card p-4 md:p-8">
              <div className="flex items-center gap-4 mb-8 border-b border-foreground/5 pb-4">
                <div className="size-3 bg-red-400" />
                <div className="size-3 bg-yellow-400" />
                <div className="size-3 bg-green-400" />
                <div className="h-4 w-32 bg-foreground/5" />
              </div>
              
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-8 border-b border-foreground/5 pb-6 last:border-0 last:pb-0">
                    <div className="space-y-2">
                      <div className={i === 1 ? "h-6 w-48 bg-foreground" : "h-6 w-48 bg-foreground/10"} />
                      <div className="h-4 w-32 bg-foreground/5" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-20 border border-foreground/10" />
                      <div className="h-8 w-20 bg-accent/20" />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Blurred Overlay for "Private" feel */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/40 backdrop-blur-[2px]">
                <div className="bg-foreground px-6 py-3 font-bold text-sm uppercase tracking-widest text-primary-foreground">
                  Private Network Only
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
