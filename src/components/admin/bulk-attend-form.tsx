"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { bulkMarkAttended } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkAttendFormProps {
  eventId: string;
}

/** Paste a CSV column of emails (Zoom attendance export) → bulk-stamp
 *  `attended_at` and fire `lead.attended` Loops events. */
export function BulkAttendForm({ eventId }: BulkAttendFormProps) {
  const [pending, startTransition] = useTransition();
  const [raw, setRaw] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Accept comma-, newline-, or space-separated. Extract anything that
    // looks like an email; ignore the rest of each Zoom CSV row.
    const emails = raw
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.includes("@"));

    if (emails.length === 0) {
      toast.error("Paste at least one email.");
      return;
    }

    startTransition(async () => {
      const result = await bulkMarkAttended({ eventId, emails });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { matched, alreadyMarked, unmatched } = result.data!;
      toast.success(
        `Marked ${matched} attended. ${alreadyMarked} already marked. ${unmatched.length} unmatched.`
      );
      if (unmatched.length > 0) {
        console.info("[bulk-attend] unmatched emails", unmatched);
      }
      setRaw("");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label
        htmlFor="attendees"
        className="block text-[12px] font-medium text-muted-foreground"
      >
        Paste attendee emails (Zoom CSV is fine — non-email cells are ignored)
      </label>
      <textarea
        id="attendees"
        rows={6}
        className={cn(
          "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        )}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="jane@example.com,jane,12:01..."
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Marking…" : "Mark attended"}
      </Button>
    </form>
  );
}
