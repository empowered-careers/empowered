"use client";

export function SocialProof() {
  const companies = ["Google", "Meta", "Amazon", "Netflix", "Apple", "Stripe"];

  return (
    <section className="overflow-hidden border-b border-border bg-background py-12">
      <div className="container mx-auto px-4 text-center">
        <p className="font-sans text-sm font-bold tracking-widest uppercase text-foreground/40 mb-10">
          Trusted by 100+ tech professionals at
        </p>
        
        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 opacity-40 grayscale contrast-125">
          {companies.map((company) => (
            <span key={company} className="font-display text-2xl font-black italic tracking-tighter">
              {company}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
