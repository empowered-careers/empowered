"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { markAsPlaced } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  applicationId: string;
  salaryHintMin: number | null;
  salaryHintMax: number | null;
}

const labelCls = "mb-1 block text-[12px] font-medium text-muted-foreground";

export function MarkAsPlacedDialog({
  applicationId,
  salaryHintMin,
  salaryHintMax,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [salary, setSalary] = useState("");
  const [fee, setFee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await markAsPlaced({
        applicationId,
        salaryCents: salary ? Math.round(Number(salary) * 100) : null,
        feeAmountCents: fee ? Math.round(Number(fee) * 100) : null,
        startDate: startDate || null,
        notes: notes.trim() || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.data?.commissionId
          ? "Placed. Commission row created."
          : "Placed."
      );
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button type="button">Mark as placed</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as placed</DialogTitle>
          <DialogDescription>
            Creates a placement row and flips the application to placed. If the
            employer is an agency partner with a commission rate, a commission
            row is also added.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="salary">
                Salary (USD)
              </label>
              <Input
                id="salary"
                inputMode="numeric"
                onChange={(e) => setSalary(e.target.value)}
                placeholder={
                  salaryHintMin || salaryHintMax
                    ? `${salaryHintMin ?? "?"}–${salaryHintMax ?? "?"}`
                    : "180000"
                }
                type="number"
                value={salary}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="fee">
                Placement fee (USD)
              </label>
              <Input
                id="fee"
                inputMode="numeric"
                onChange={(e) => setFee(e.target.value)}
                placeholder="25000"
                type="number"
                value={fee}
              />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="start_date">
              Start date
            </label>
            <Input
              id="start_date"
              onChange={(e) => setStartDate(e.target.value)}
              type="date"
              value={startDate}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="notes">
              Notes
            </label>
            <textarea
              className={cn(
                "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none",
                "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              )}
              id="notes"
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              value={notes}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() => setOpen(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? "Placing…" : "Confirm placement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
