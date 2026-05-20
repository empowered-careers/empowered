"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateInternalNotes } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  profileId: string;
  initialNotes: string;
}

export function InternalNotesEditor({ profileId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [pending, startTransition] = useTransition();

  const dirty = notes !== initialNotes;

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateInternalNotes(profileId, notes);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Notes saved.");
    });
  };

  return (
    <div className="space-y-2">
      <textarea
        className={cn(
          "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        )}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Visible only to admins. Coaching context, red flags, follow-ups…"
        rows={6}
        value={notes}
      />
      <div className="flex items-center gap-2">
        <Button disabled={!dirty || pending} onClick={handleSave} type="button">
          {pending ? "Saving…" : "Save notes"}
        </Button>
        {dirty && (
          <Button
            disabled={pending}
            onClick={() => setNotes(initialNotes)}
            type="button"
            variant="ghost"
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
