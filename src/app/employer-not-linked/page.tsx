import Link from "next/link";

export const metadata = {
  title: "Account not linked · Empowered Careers",
  robots: { index: false, follow: false },
};

export default function NotLinkedPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 className="font-display font-medium text-2xl tracking-tight">
        Your account isn&apos;t linked to a company yet
      </h1>
      <p className="mt-3 text-muted-foreground text-sm">
        Empowered Careers links each employer account to a company record before
        you can post roles or view interested candidates. Please reach out to
        your Empowered Careers contact so they can finish the setup.
      </p>
      <p className="mt-6 text-sm">
        <Link
          className="underline underline-offset-2"
          href="mailto:hello@empowered-careers.com"
        >
          hello@empowered-careers.com
        </Link>
      </p>
    </div>
  );
}
