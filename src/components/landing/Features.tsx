const features = [
  {
    kicker: "Guardrails",
    title: "Nothing invented",
    description:
      "The AI works only from your history. Where there's a gap, it asks you instead of filling it in.",
  },
  {
    kicker: "Voice",
    title: "Your voice, on purpose",
    description:
      "A short personality assessment shapes how your materials read, so two people with identical skills don't end up with identical resumes.",
  },
  {
    kicker: "Depth",
    title: "Depth on your wins",
    description:
      "Size, scope, scale, budget, impact. The numbers people leave off are the ones hiring managers screen for. We keep asking until they surface.",
  },
  {
    kicker: "Experience",
    title: "A real recruiter behind it",
    description:
      "Lauren Laughlin has spent 15+ years placing people in roles like yours. The product asks the questions she asks.",
  },
];

export function Features() {
  return (
    <section className="border-y border-border bg-background py-24 md:py-32">
      <div className="container mx-auto px-4">
        <p className="mb-4 font-sans font-semibold text-[11px] text-accent uppercase tracking-[0.18em]">
          Why this is different
        </p>
        <h2 className="mb-16 max-w-3xl font-display font-bold text-4xl text-foreground md:text-5xl">
          Built by a recruiter. Kept honest on purpose.
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          {features.map((feature) => (
            <div
              className="border border-border bg-card p-7 transition-colors hover:border-accent/50"
              key={feature.title}
            >
              <span className="inline-block bg-accent px-2 py-0.5 font-sans font-bold text-[10px] text-accent-foreground uppercase tracking-[0.12em]">
                {feature.kicker}
              </span>
              <h3 className="mt-4 mb-2 font-display font-bold text-xl text-foreground">
                {feature.title}
              </h3>
              <p className="font-sans text-foreground/60 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
