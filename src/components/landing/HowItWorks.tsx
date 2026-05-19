"use client";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Get Assessed",
      description:
        "Upload your resume, link LinkedIn. We score your profile across 8 dimensions including technical depth, leadership potential, and market value.",
    },
    {
      number: "02",
      title: "Access Exclusive Roles",
      description:
        "Subscribe to unlock roles that never hit public job boards. These are direct-to-recruiter opportunities from our private network.",
    },
    {
      number: "03",
      title: "Get Matched",
      description:
        "Our algorithm surfaces roles where you're a top 5% fit — moving beyond keyword matching to true competency alignment.",
    },
  ];

  return (
    <section id="how-it-works" className="bg-background py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mb-20">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
            The private path to your next <br />
            career breakthrough.
          </h2>
          <p className="font-sans text-lg text-foreground/60">
            Stop competing in public talent pools. Join the 1% who get hired
            through private networks.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((step) => (
            <div key={step.number} className="relative group">
              <div className="font-display text-8xl font-black text-foreground/[0.03] absolute -top-12 -left-4 pointer-events-none group-hover:text-accent/10 transition-colors duration-500">
                {step.number}
              </div>
              <div className="relative z-10 pt-8">
                <h3 className="font-display text-2xl font-bold text-foreground mb-4">
                  {step.title}
                </h3>
                <p className="font-sans text-foreground/60 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
