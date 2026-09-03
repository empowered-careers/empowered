import Image from "next/image";

export function MeetLauren() {
  return (
    <section
      className="border-y border-border bg-background py-24 md:py-32"
      id="lauren"
    >
      <div className="container mx-auto grid gap-x-14 gap-y-7 px-4 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="mb-4 font-sans font-semibold text-[11px] text-accent uppercase tracking-[0.18em]">
            Meet Lauren
          </p>
          <h2 className="mb-4 font-display font-bold text-4xl text-foreground md:text-5xl">
            The recruiter inside the product
          </h2>
          <p className="font-display text-3xl text-foreground italic">
            Lauren Laughlin
          </p>
          <p className="mt-1 font-sans text-foreground/50 text-sm">
            Founder &amp; CEO
          </p>
        </div>
        <div className="relative aspect-[4/4.2] border border-border md:row-start-2">
          <Image
            alt="Lauren Laughlin, founder of Empowered Careers"
            className="object-cover object-[50%_22%]"
            fill
            loading="eager"
            sizes="(min-width: 768px) 40vw, 100vw"
            src="/lauren.webp"
          />
        </div>
        <div className="mt-7 md:col-start-2 md:row-start-2 md:mt-0">
          <p className="max-w-prose font-sans text-foreground/70 leading-relaxed">
            Lauren has spent more than fifteen years on the hiring side of the
            table, recruiting for companies across industries and coaching the
            candidates they hired. Empowered Careers is her coaching practice
            and her screening instincts, built into a product.
          </p>
          <blockquote className="mt-8 border-accent border-l-[3px] pl-6">
            <p className="font-display text-2xl text-foreground italic leading-snug">
              Be bold. Be Empowered.
            </p>
            <footer className="mt-4 font-sans text-[11px] text-foreground/50 uppercase tracking-[0.1em]">
              Lauren Laughlin, Founder
            </footer>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
