"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { updateApplicationStatus } from "@/app/actions/admin";
import type { ApplicationStatus } from "@/types/db";

const STATUSES: ApplicationStatus[] = [
  "interested",
  "submitted",
  "screening",
  "interviewing",
  "offer",
  "placed",
  "rejected",
  "withdrawn",
];

interface Props {
  applicationId: string;
  currentStatus: ApplicationStatus;
}

export function ApplicationStatusMover({
  applicationId,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleChange = (status: ApplicationStatus) => {
    if (status === currentStatus) return;
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, status);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Status updated.");
      router.refresh();
    });
  };

  return (
    <select
      className="h-9 border border-border bg-background px-2 text-sm"
      disabled={pending}
      onChange={(e) => handleChange(e.target.value as ApplicationStatus)}
      value={currentStatus}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
