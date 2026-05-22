"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createEvent,
  setEventPast,
  setEventPublished,
  updateEvent,
} from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EventRow, EventType } from "@/types/db";

const TYPES: { value: EventType; label: string }[] = [
  { value: "webinar", label: "Webinar" },
  { value: "workshop", label: "Workshop" },
  { value: "ama", label: "AMA" },
  { value: "masterclass", label: "Masterclass" },
];

const labelCls = "mb-1 block text-[12px] font-medium text-muted-foreground";
const selectCls = cn(
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none transition-[color,box-shadow]",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

/** datetime-local needs `YYYY-MM-DDTHH:MM`, not an ISO string. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({ event }: { event?: EventRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = !!event;

  const [form, setForm] = useState({
    slug: event?.slug ?? "",
    title: event?.title ?? "",
    subtitle: event?.subtitle ?? "",
    description: event?.description ?? "",
    event_type: (event?.event_type ?? "webinar") as EventType,
    host_name: event?.host_name ?? "Lauren Laughlin",
    scheduled_at: toLocalInput(event?.scheduled_at),
    duration_min: event?.duration_min?.toString() ?? "60",
    max_seats: event?.max_seats?.toString() ?? "",
    cover_image_url: event?.cover_image_url ?? "",
    replay_url: event?.replay_url ?? "",
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.slug.trim() || !form.title.trim() || !form.scheduled_at) {
      toast.error("Slug, title, and scheduled time are required.");
      return;
    }

    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      event_type: form.event_type,
      host_name: form.host_name.trim() || "Lauren Laughlin",
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_min: form.duration_min ? Number(form.duration_min) : 60,
      max_seats: form.max_seats ? Number(form.max_seats) : null,
      cover_image_url: form.cover_image_url.trim() || null,
      replay_url: form.replay_url.trim() || null,
    };

    startTransition(async () => {
      const result = editing
        ? await updateEvent(event!.id, payload)
        : await createEvent(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Event updated." : "Event created.");
      router.push("/admin/events");
      router.refresh();
    });
  };

  const togglePublished = () => {
    if (!event) return;
    startTransition(async () => {
      const result = await setEventPublished(event.id, !event.is_published);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(event.is_published ? "Unpublished." : "Published.");
        router.refresh();
      }
    });
  };

  const togglePast = () => {
    if (!event) return;
    startTransition(async () => {
      const result = await setEventPast(event.id, !event.is_past);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(event.is_past ? "Marked upcoming." : "Marked past.");
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="slug" className={labelCls}>
            Slug (URL)
          </label>
          <Input
            id="slug"
            required
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            placeholder="resume-masterclass-june"
          />
        </div>
        <div>
          <label htmlFor="event_type" className={labelCls}>
            Type
          </label>
          <select
            id="event_type"
            className={selectCls}
            value={form.event_type}
            onChange={(e) => update("event_type", e.target.value as EventType)}
          >
            {TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="title" className={labelCls}>
            Title
          </label>
          <Input
            id="title"
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="subtitle" className={labelCls}>
            Subtitle
          </label>
          <Input
            id="subtitle"
            value={form.subtitle}
            onChange={(e) => update("subtitle", e.target.value)}
            placeholder="One sentence framing"
          />
        </div>
        <div>
          <label htmlFor="scheduled_at" className={labelCls}>
            Scheduled at (local)
          </label>
          <Input
            id="scheduled_at"
            type="datetime-local"
            required
            value={form.scheduled_at}
            onChange={(e) => update("scheduled_at", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="duration_min" className={labelCls}>
              Duration (min)
            </label>
            <Input
              id="duration_min"
              type="number"
              inputMode="numeric"
              value={form.duration_min}
              onChange={(e) => update("duration_min", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="max_seats" className={labelCls}>
              Max seats
            </label>
            <Input
              id="max_seats"
              type="number"
              inputMode="numeric"
              value={form.max_seats}
              onChange={(e) => update("max_seats", e.target.value)}
              placeholder="unlimited"
            />
          </div>
        </div>
        <div>
          <label htmlFor="host_name" className={labelCls}>
            Host
          </label>
          <Input
            id="host_name"
            value={form.host_name}
            onChange={(e) => update("host_name", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="cover_image_url" className={labelCls}>
            Cover image URL
          </label>
          <Input
            id="cover_image_url"
            type="url"
            value={form.cover_image_url}
            onChange={(e) => update("cover_image_url", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="replay_url" className={labelCls}>
            Replay URL (set after event)
          </label>
          <Input
            id="replay_url"
            type="url"
            value={form.replay_url}
            onChange={(e) => update("replay_url", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className={labelCls}>
          Description
        </label>
        <textarea
          id="description"
          rows={8}
          className={cn(
            "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          )}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What attendees will learn, what they'll walk away with…"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {editing ? "Save changes" : "Create event"}
        </Button>
        {editing && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={togglePublished}
            >
              {event!.is_published ? "Unpublish" : "Publish"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={togglePast}
            >
              {event!.is_past ? "Mark upcoming" : "Mark past"}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
