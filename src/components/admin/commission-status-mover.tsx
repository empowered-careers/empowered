"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { updateCommissionStatus } from "@/app/actions/admin";

const STATUSES = ["pending", "invoiced", "paid", "written_off"] as const;
type Status = (typeof STATUSES)[number];

interface Props {
  commissionId: string;
  currentStatus: Status;
}

export function CommissionStatusMover({ commissionId, currentStatus }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleChange = (status: Status) => {
    if (status === currentStatus) return;
    startTransition(async () => {
      const result = await updateCommissionStatus(commissionId, status);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Commission updated.");
      router.refresh();
    });
  };

  return (
    <select
      className="h-7 border border-border bg-background px-1.5 text-[12px]"
      disabled={pending}
      onChange={(e) => handleChange(e.target.value as Status)}
      value={currentStatus}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
