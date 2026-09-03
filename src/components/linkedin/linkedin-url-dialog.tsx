"use client";

import { type FormEvent, type ReactNode, useId, useState } from "react";
import { useTransition } from "react";
import { toast } from "sonner";

import { updateLinkedInUrl } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/**
 * Collects `profiles.linkedin_url`. Shared by the dashboard's profile
 * completeness card and the PDF upload flow, which needs it mid-upload: the
 * export can't be attached to anything until the profile has a URL.
 *
 * `onSaved` runs only after the URL is persisted, so the caller decides what
 * happens next — refresh the page, or retry a pending upload.
 */
export function LinkedInUrlDialog({
  open,
  onOpenChange,
  initialUrl,
  title = "Add LinkedIn profile URL",
  description,
  submitLabel = "Save",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUrl?: string | null;
  title?: string;
  description?: ReactNode;
  submitLabel?: string;
  onSaved: () => void;
}) {
  const formId = useId();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await updateLinkedInUrl(url);
      if (!result.success) {
        setFormError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("LinkedIn profile URL saved.");
      onOpenChange(false);
      onSaved();
    });
  };

  return (
    <Dialog
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setFormError(null);
      }}
      open={open}
    >
      <DialogContent aria-describedby={`${formId}-desc`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription id={`${formId}-desc`}>
            {description ?? (
              <>
                Paste your public profile link (e.g.{" "}
                <span className="whitespace-nowrap font-mono text-xs">
                  linkedin.com/in/your-handle
                </span>
                ).
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              className="font-medium text-sm text-foreground"
              htmlFor={`${formId}-url`}
            >
              Profile URL
            </label>
            <Input
              autoComplete="url"
              className={formError ? "border-destructive" : undefined}
              disabled={isSaving}
              id={`${formId}-url`}
              name="linkedin_url"
              onChange={(ev) => setUrl(ev.target.value)}
              placeholder="https://www.linkedin.com/in/your-handle"
              type="url"
              value={url}
            />
            {formError ? (
              <p className="text-destructive text-xs" role="alert">
                {formError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
