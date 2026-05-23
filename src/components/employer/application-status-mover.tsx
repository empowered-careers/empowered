"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { advanceApplicationStatus } from "@/app/actions/employer";
import type { ApplicationStatus } from "@/types/db";

const EMPLOYER_STATUSES = [
  "screening",
  "interviewing",
  "offer",
  "rejected",
] as const;

type EmployerStatus = (typeof EMPLOYER_STATUSES)[number];

interface Props {
  applicationId: string;
  currentStatus: ApplicationStatus;
}

export function EmployerApplicationStatusMover({
  applicationId,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleChange = (status: EmployerStatus) => {
    if (status === currentStatus) return;
    startTransition(async () => {
      const result = await advanceApplicationStatus(applicationId, status);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Status updated.");
      router.refresh();
    });
  };

  // For 'interested'/'submitted', display a hint instead of letting the
  // employer move backwards. Same for 'placed'/'withdrawn' — terminal states
  // that aren't theirs to control.
  const isEmployerStatus = (EMPLOYER_STATUSES as readonly string[]).includes(
    currentStatus
  );

  return (
    <div className="flex items-center gap-2">
      <select
        className="h-9 border border-border bg-background px-2 text-sm capitalize"
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as EmployerStatus)}
        value={isEmployerStatus ? currentStatus : ""}
      >
        {!isEmployerStatus && (
          <option value="" disabled>
            {currentStatus}
          </option>
        )}
        {EMPLOYER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
