const steps = [
  {
    number: "01",
    title: "Get your score",
    description:
      "Upload your resume and connect your LinkedIn. You get a score out of 100 and a clear read on what's working and what's holding you back.",
  },
  {
    number: "02",
    title: "Strengthen your story",
    description:
      "AI-assisted improvements to your resume and LinkedIn, written in your voice and grounded in your real history. Nothing gets invented, because the tool only works from what you've actually done.",
  },
  {
    number: "03",
    title: "Add a coach when you want one",
    description:
      "The tools stand on their own. When you want a human read, book a session with a coach who knows what hiring managers look for, with a wrap-up conversation built into the price.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-background py-24 md:py-32" id="how-it-works">
      <div className="container mx-auto px-4">
        <p className="mb-4 font-sans font-semibold text-[11px] text-accent uppercase tracking-[0.18em]">
          How it works
        </p>
        <h2 className="mb-16 max-w-3xl font-display font-bold text-4xl text-foreground md:text-5xl">
          Score it, strengthen it, own the story.
        </h2>

        <div className="grid gap-12 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number}>
              <div className="font-display text-4xl text-accent/85 leading-none">
                {step.number}
              </div>
              <h3 className="mt-4 mb-3 font-display font-bold text-2xl text-foreground">
                {step.title}
              </h3>
              <p className="font-sans text-foreground/60 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
