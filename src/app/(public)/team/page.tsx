export const metadata = {
  title: "Team",
  description: "The people behind Empowered Careers.",
  alternates: { canonical: "/team" },
};

export default function TeamPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <header className="mb-8">
        <p className="text-[12px] uppercase tracking-wide text-muted-foreground">
          Empowered Careers
        </p>
        <h1 className="mt-3 font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
          Team
        </h1>
      </header>
      <p className="text-base text-muted-foreground">Content coming soon.</p>
    </div>
  );
}
