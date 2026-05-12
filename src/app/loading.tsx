import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h2 className="font-semibold text-lg">Loading...</h2>
          <p className="text-muted-foreground text-sm">
            Please wait while we load the page.
          </p>
        </div>
        <div className="flex justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}
