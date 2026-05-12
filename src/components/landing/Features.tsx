"use client";

import { Check } from "lucide-react";

export function Features() {
  const features = [
    {
      title: "Recruiter-First Network",
      description: "Direct access to curated roles from Lauren's 15-year senior recruiter network at top tech firms."
    },
    {
      title: "Absolute Exclusivity",
      description: "No public job board spam. 80% of our roles are never posted on LinkedIn, Indeed, or Otta."
    },
    {
      title: "Competency Matching",
      description: "Moving beyond keyword soup. Our assessment scores ensure you only see roles you're truly qualified for."
    }
  ];

  return (
    <section className="border-y border-border bg-background py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row gap-16 md:items-center">
          <div className="flex-1">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-8">
              Why Empowered Careers?
            </h2>
            <p className="font-sans text-xl text-foreground/60 mb-12">
              We've spent a decade inside the hiring rooms of the world's most innovative companies. We know how the best roles are actually filled.
            </p>
            
            <div className="grid gap-8">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex gap-4 border border-border bg-muted/50 p-6 transition-colors hover:border-accent/50"
                >
                  <div className="size-6 bg-accent text-accent-foreground flex items-center justify-center mt-1 shrink-0">
                    <Check className="size-4" />
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-foreground text-lg mb-2">{feature.title}</h4>
                    <p className="font-sans text-foreground/60">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex-1 relative aspect-square max-w-lg mx-auto">
             <div className="absolute inset-0 bg-accent/5 -z-10" />
             <div className="absolute inset-8 flex flex-col justify-between border border-border bg-card p-8">
                <div className="space-y-4">
                   <div className="h-2 w-12 bg-accent" />
                   <h3 className="font-display text-3xl font-bold italic tracking-tight text-foreground">"This is the first time I've seen roles that aren't just the same recycled LinkedIn postings."</h3>
                </div>
                <div className="flex items-center gap-4">
                   <div className="size-12 bg-foreground" />
                   <div>
                      <p className="font-sans font-bold text-foreground">Director of Engineering</p>
                      <p className="font-sans text-sm text-foreground/40">Fortune 500 FinTech</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
