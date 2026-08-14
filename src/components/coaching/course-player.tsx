"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setCourseProgress } from "@/app/actions/coaching";
import { Button } from "@/components/ui/button";

/**
 * Course delivery: an unlisted video embed plus self-reported progress (D2 —
 * no Mux, no Kajabi, so there is no playback telemetry to derive it from).
 *
 * Renders with `embedUrl = null` so the page works before Lauren has pasted
 * the video URLs in.
 */
const STEPS = [25, 50, 75, 100];

interface Props {
  name: string;
  embedUrl: string | null;
  enrollmentId: string | null;
  initialProgress: number;
}

export function CoursePlayer({
  name,
  embedUrl,
  enrollmentId,
  initialProgress,
}: Props) {
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);
  const [pending, startTransition] = useTransition();

  function mark(next: number) {
    if (!enrollmentId) return;
    const previous = progress;
    setProgress(next); // optimistic — the bar is the only thing that moves
    startTransition(async () => {
      const result = await setCourseProgress(enrollmentId, next);
      if (!result.ok) {
        setProgress(previous);
        toast.error(result.error);
        return;
      }
      toast.success(
        next === 100 ? "Course marked complete." : "Progress saved."
      );
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild className="mb-4 -ml-2" size="sm" variant="ghost">
        <Link href="/content">
          <ArrowLeft className="mr-1.5 size-3.5" />
          My Coaching
        </Link>
      </Button>

      <h1 className="font-display font-medium text-2xl tracking-tight">
        {name}
      </h1>

      <div className="mt-6 border border-border bg-card">
        {embedUrl ? (
          <div className="aspect-video">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              className="size-full"
              src={embedUrl}
              title={name}
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center px-6 text-center">
            <p className="text-muted-foreground text-sm">
              The video for this course isn&apos;t published yet. You have
              access — we&apos;ll email you the moment it&apos;s live.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 border border-border bg-card p-5">
        <div className="h-[3px] bg-foreground/15">
          <div
            className="h-full bg-accent transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          {progress}% complete
        </p>

        {enrollmentId && (
          <div className="mt-4 flex flex-wrap gap-2">
            {STEPS.map((step) => (
              <Button
                disabled={pending || progress === step}
                key={step}
                onClick={() => mark(step)}
                size="sm"
                variant={progress >= step ? "default" : "outline"}
              >
                {step === 100 ? "Mark complete" : `${step}%`}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
