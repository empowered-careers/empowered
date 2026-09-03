/** Sourced stats — the attribution stays visible on purpose. */
const stats = [
  {
    number: "250%",
    description:
      "more applicants compete for executive-level roles than mid-level ones. Your materials have seconds to land.",
    source: "Jobvite",
  },
  {
    number: "85%",
    description:
      "of jobs are filled through networking, never touching a public posting. Your LinkedIn is how they find you.",
    source: "LinkedIn",
  },
  {
    number: "40%",
    description:
      "Executives who add a career coach are 40% more likely to land the role. That option stays one click away.",
    source: "International Coaching Federation",
  },
];

export function MarketStats() {
  return (
    <section className="bg-background py-24 md:py-32">
      <div className="container mx-auto px-4">
        <p className="mb-4 font-sans font-semibold text-[11px] text-accent uppercase tracking-[0.18em]">
          The market right now
        </p>
        <h2 className="mb-16 max-w-3xl font-display font-bold text-4xl text-foreground md:text-5xl">
          Know the numbers you&apos;re up against.
        </h2>

        <div className="grid gap-11 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.source}>
              <div className="font-display text-6xl text-accent leading-none">
                {stat.number}
              </div>
              <p className="mt-4 mb-2 font-sans text-foreground/60 leading-relaxed">
                {stat.description}
              </p>
              <p className="font-sans text-[11px] text-foreground/40 uppercase tracking-[0.08em]">
                {stat.source}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
