/** Companies from Lauren's public coaching site — substantiated, unlike a logo strip. */
const companies = ["SpaceX", "Warner Bros.", "Paramount Pictures", "McAfee"];

export function SocialProof() {
  return (
    <section className="border-b border-border bg-background py-14">
      <div className="container mx-auto px-4">
        <p className="mb-4 font-sans font-semibold text-[11px] text-foreground/40 uppercase tracking-[0.18em]">
          Companies Lauren has served
        </p>
        <div className="flex flex-wrap items-baseline gap-x-11 gap-y-3">
          {companies.map((company) => (
            <span
              className="font-display text-2xl text-foreground/50 italic"
              key={company}
            >
              {company}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
