import Link from "next/link";

import { DimensionList } from "@/components/score/dimension-list";
import { Button } from "@/components/ui/button";

/**
 * Sample report shown in the hero. The dimension keys and labels are the five
 * the scorer actually returns (`ScoringDimensionsSchema` / `DIMENSION_LABELS`),
 * rendered through the same `DimensionList` the resume page uses, so the card is
 * a faithful preview of what signup delivers. The values are illustrative.
 */
const SAMPLE_OVERALL = 74;
const SAMPLE_DIMENSIONS = [
  { key: "tenure", label: "Tenure", value: 82 },
  { key: "role_progression", label: "Role progression", value: 71 },
  { key: "skill_density", label: "Skill density", value: 78 },
  { key: "impact_signals", label: "Impact signals", value: 54 },
  { key: "formatting", label: "Formatting", value: 88 },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background py-20 md:py-28">
      {/* Background grid, faded out towards the bottom */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.06]"
        style={{
          backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          maskImage: "linear-gradient(to bottom, #000 40%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 40%, transparent)",
        }}
      />

      <div className="container relative z-10 mx-auto grid items-center gap-14 px-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="mb-5 font-sans font-semibold text-[11px] text-accent uppercase tracking-[0.18em]">
            Be bold. Be Empowered.
          </p>
          <h1 className="mb-8 font-display font-bold text-5xl text-foreground leading-[1.1] tracking-tight md:text-6xl">
            <span className="block">Get hired faster.</span>
            <span className="block">Get paid what you&apos;re worth.</span>
          </h1>
          <p className="mb-8 max-w-xl font-sans text-foreground/70 text-lg leading-relaxed md:text-xl">
            You&apos;ve done the work. Empowered Careers helps hiring teams see
            it: AI tools with a recruiter&apos;s judgment rebuild your resume
            and LinkedIn in your voice. Real coaching is one click away.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              asChild
              className="h-14 px-10 font-bold text-lg"
              size="lg"
              variant="lime"
            >
              <Link href="/login?tab=signup">Get started</Link>
            </Button>
            <Button
              asChild
              className="h-14 border-2 px-10 font-bold text-lg"
              size="lg"
              variant="outline"
            >
              <Link href="#how-it-works">How it works</Link>
            </Button>
          </div>
          <p className="mt-5 font-sans text-foreground/50 text-sm">
            Start free with your resume score. No credit card.
          </p>
        </div>

        <div className="relative border border-border bg-card p-8">
          <span className="absolute -top-3 left-6 bg-accent px-2.5 py-0.5 font-sans font-bold text-[10px] text-accent-foreground uppercase tracking-[0.14em]">
            Your resume score
          </span>
          <p className="font-sans text-[11px] text-foreground/50 uppercase tracking-[0.16em]">
            Overall
          </p>
          <p className="font-display font-bold text-6xl text-foreground leading-none">
            {SAMPLE_OVERALL}
            <span className="ml-1 font-medium text-2xl text-foreground/50">
              /100
            </span>
          </p>

          <DimensionList className="my-7" items={SAMPLE_DIMENSIONS} />

          <p className="border-t border-border pt-4 font-sans text-foreground/70 text-sm">
            <b className="font-semibold text-foreground">
              What&apos;s holding you back:
            </b>{" "}
            your last two roles list responsibilities without a single number a
            hiring manager can weigh.
          </p>
          <p className="mt-4 font-sans text-[11px] text-foreground/40 tracking-wide">
            Sample report shown for illustration.
          </p>
        </div>
      </div>
    </section>
  );
}
