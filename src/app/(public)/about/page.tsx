export const metadata = {
  title: "About",
  description:
    "Empowered Careers is a closed-loop talent network for mid-to-senior tech professionals.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <header className="mb-8">
        <p className="text-[12px] uppercase tracking-wide text-muted-foreground">
          Empowered Careers
        </p>
        <h1 className="mt-3 font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
          About
        </h1>
      </header>
      <p className="text-base text-muted-foreground">Content coming soon.</p>
    </div>
  );
}
