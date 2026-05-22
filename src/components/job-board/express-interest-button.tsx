"use client";

import { Check, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { expressInterest } from "@/app/actions/jobs";
import { saveExpressInterestPrefs } from "@/app/actions/preferences";
import {
  ExpressInterestPrefsStep,
  type ExpressInterestPrefsValues,
} from "@/components/job-board/express-interest-prefs-step";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApplicationStatus } from "@/types/db";

/**
 * Express Interest CTA + PII consent modal.
 *
 * If `needsPrefs` is true (no comp/location/remote captured yet), the modal
 * prepends a one-screen prefs form before the consent footer. After the
 * first save the parent re-renders with `needsPrefs=false` and subsequent
 * applications skip straight to consent.
 */
export function ExpressInterestButton({
  jobId,
  jobTitle,
  applicationStatus,
  needsPrefs = false,
  size = "sm",
}: {
  jobId: string;
  jobTitle: string;
  applicationStatus: ApplicationStatus | null;
  needsPrefs?: boolean;
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<ExpressInterestPrefsValues | null>(null);
  const [pending, startTransition] = useTransition();

  const hasApplication = applicationStatus !== null;

  if (hasApplication) {
    return (
      <Button size={size} variant="secondary" type="button" disabled>
        <Check className="mr-1.5 size-4" />
        Interested
      </Button>
    );
  }

  const canConfirm = needsPrefs ? prefs !== null : true;

  const handleConfirm = () => {
    startTransition(async () => {
      if (needsPrefs) {
        if (!prefs) {
          toast.error("Fill the three fields above first.");
          return;
        }
        const prefsResult = await saveExpressInterestPrefs(prefs);
        if (!prefsResult.ok) {
          toast.error(prefsResult.error);
          return;
        }
      }

      const result = await expressInterest(jobId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      if (result.data?.alreadyApplied) {
        toast("You already expressed interest in this role.");
      } else {
        toast.success("Interest noted", {
          description: `${jobTitle} is now in your pipeline.`,
        });
      }
    });
  };

  return (
    <>
      <Button size={size} type="button" onClick={() => setOpen(true)}>
        <Send className="mr-1.5 size-4" />
        Express interest
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share your profile?</DialogTitle>
            <DialogDescription>
              Your full profile (name, email, resume, assessment results) will
              be shared with the hiring company.
            </DialogDescription>
          </DialogHeader>

          {needsPrefs && <ExpressInterestPrefsStep onChange={setPrefs} />}

          <p className="text-sm text-muted-foreground">
            We&apos;ll add <span className="text-foreground">{jobTitle}</span>{" "}
            to your pipeline. You can withdraw at any time.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={pending || !canConfirm}
            >
              {pending ? "Sharing…" : "Yes, express interest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
