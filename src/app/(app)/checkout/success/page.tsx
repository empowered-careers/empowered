"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

export default function CheckoutSuccessPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    const startedAt = Date.now();
    let active = true;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan, subscription_status")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      const confirmed =
        data && (data.subscription_status === "active" || data.plan !== "free");

      if (confirmed) {
        clearInterval(interval);
        toast.success("Payment confirmed — welcome aboard!");
        router.push("/dashboard");
      } else if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        clearInterval(interval);
        setTimedOut(true);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user?.id, router]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      {timedOut ? (
        <>
          <h1 className="font-display text-2xl font-medium text-foreground">
            We received your payment
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Your account will update shortly. If it doesn&apos;t, refresh in a
            moment.
          </p>
          <div className="mt-6 flex gap-3">
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh
            </Button>
            <Button asChild>
              <a href="/dashboard">Go to dashboard</a>
            </Button>
          </div>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-medium text-foreground">
            Confirming your payment…
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            This takes a few seconds. Don&apos;t close this tab.
          </p>
        </>
      )}
    </div>
  );
}
