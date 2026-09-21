"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type ActionResult = { success: true } | { success: false; error: string };

/**
 * Retry control for a failed background job.
 *
 * Disabled while the action is in flight — without it a double-click fires the
 * job twice. That happened in the beta: one resume got two `resume/uploaded`
 * events 1.7 seconds apart and burned a full duplicate parse.
 *
 * Stays disabled after a successful queue, because the row is now processing
 * and the parent won't re-render until the realtime update lands.
 */
export function RetryButton({
  action,
  label = "Retry",
  pendingLabel = "Queueing…",
  successMessage = "Queued — parsing in progress",
  className,
}: {
  action: () => Promise<ActionResult>;
  label?: string;
  pendingLabel?: string;
  successMessage?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "pending" | "queued">("idle");

  return (
    <Button
      size="sm"
      variant="outline"
      className={className}
      disabled={state !== "idle"}
      onClick={async () => {
        setState("pending");
        const result = await action();
        if (result.success) {
          toast.success(successMessage);
          setState("queued");
        } else {
          toast.error(result.error);
          setState("idle");
        }
      }}
    >
      {state === "idle" ? (
        label
      ) : (
        <>
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          {pendingLabel}
        </>
      )}
    </Button>
  );
}
