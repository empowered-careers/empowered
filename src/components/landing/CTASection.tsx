import Link from "next/link";

import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="bg-background py-28 md:py-36">
      <div className="container mx-auto px-4 text-center">
        <h2 className="mb-6 font-display font-bold text-4xl text-foreground md:text-6xl">
          Ready when you are.
        </h2>
        <p className="mx-auto mb-10 max-w-2xl font-sans text-foreground/70 text-lg leading-relaxed">
          Start with your resume score, see what the tools can do, and add a
          coach whenever you want one. Your story is worth telling properly.
        </p>
        <Button
          asChild
          className="h-16 px-12 font-bold text-xl"
          size="lg"
          variant="lime"
        >
          <Link href="/login?tab=signup">Get started</Link>
        </Button>
        <p className="mt-6 font-sans font-semibold text-[11px] text-foreground/50 uppercase tracking-wide">
          No credit card required. Instant resume score.
        </p>
      </div>
    </section>
  );
}
