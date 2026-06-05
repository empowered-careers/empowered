import { Button } from "@/components/ui/button";

export const metadata = { title: "Checkout canceled" };

export default async function CheckoutCancelPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <h1 className="font-display text-2xl font-medium text-foreground">
        Checkout canceled
      </h1>
      <p className="mt-2 text-[14px] text-muted-foreground">
        No charge was made. You can pick a plan whenever you&apos;re ready.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <a href="/pricing">Back to plans</a>
        </Button>
        <Button asChild variant="outline">
          <a href="/dashboard">Go to dashboard</a>
        </Button>
      </div>
    </div>
  );
}
