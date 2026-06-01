export const metadata = {
  title: "Blog",
  description:
    "Career strategy, hiring insights, and the inside view from Empowered Careers.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
      <header className="mb-8 max-w-2xl">
        <p className="text-[12px] uppercase tracking-wide text-muted-foreground">
          Empowered Careers
        </p>
        <h1 className="mt-3 font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
          Blog
        </h1>
      </header>
      <p className="text-base text-muted-foreground">Content coming soon.</p>
    </div>
  );
}
