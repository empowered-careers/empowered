"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";

export function PricingTeaser() {
  return (
    <section id="pricing" className="bg-background py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
            Simple, transparent access.
          </h2>
          <p className="font-sans text-lg text-foreground/60">
            Start with our free assessment tools, or unlock the full private network.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Card */}
          <div className="flex flex-col border border-border bg-card p-10">
            <h3 className="font-display text-2xl font-bold mb-2">Free Tools</h3>
            <div className="mb-8">
               <span className="text-4xl font-black text-foreground">$0</span>
               <span className="text-foreground/40 font-sans ml-2">/ forever</span>
            </div>
            
            <ul className="space-y-4 mb-12 flex-1">
              {["Resume ATS score", "LinkedIn profile grade", "Basic career resources"].map((item) => (
                <li key={item} className="flex gap-3 text-foreground/60">
                  <Check className="size-5 text-accent" />
                  <span className="font-sans">{item}</span>
                </li>
              ))}
            </ul>
            
            <Button variant="outline" size="lg" className="w-full font-bold h-12" asChild>
              <Link href="/login?tab=signup">Start Free</Link>
            </Button>
          </div>
          
          {/* Premium Card */}
          <div className="relative flex flex-col overflow-hidden border border-foreground bg-foreground p-10 text-background">
            <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-4 py-1 text-xs font-bold uppercase tracking-widest">
               Most Popular
            </div>
            <h3 className="mb-2 font-display text-2xl font-bold text-background">
              Premium Access
            </h3>
            <div className="mb-8">
               <span className="text-4xl font-black text-background">$XX</span>
               <span className="ml-2 font-sans text-background/50">/ month</span>
            </div>
            
            <ul className="space-y-4 mb-12 flex-1">
              {[
                "Everything in Free",
                "Access to private job board",
                "Priority matching algorithm",
                "Direct recruiter introductions"
              ].map((item) => (
                <li key={item} className="flex gap-3 text-background/85">
                  <Check className="size-5 text-accent" />
                  <span className="font-sans">{item}</span>
                </li>
              ))}
            </ul>
            
            <Button variant="lime" size="lg" className="w-full font-bold h-12" asChild>
              <Link href="/login?tab=signup">Unlock Premium</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
