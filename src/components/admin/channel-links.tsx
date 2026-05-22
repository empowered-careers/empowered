"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChannelLinksProps {
  baseUrl: string;
  slug: string;
}

const CHANNELS = ["linkedin", "email", "instagram", "newsletter"] as const;

/** Per-event share-link generator. Lauren copies one link per channel and
 *  pastes it into LinkedIn / her email / IG post; the `src` param is what
 *  drives `leads.source` attribution. */
export function ChannelLinks({ baseUrl, slug }: ChannelLinksProps) {
  const [ref, setRef] = useState("");

  const buildUrl = (channel: string) => {
    const url = new URL(`/events/${slug}`, baseUrl);
    url.searchParams.set("src", channel);
    if (ref.trim()) url.searchParams.set("ref", ref.trim());
    return url.toString();
  };

  const copy = async (channel: string) => {
    const url = buildUrl(channel);
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Copied ${channel} link`);
    } catch {
      toast.error("Copy failed — select and copy manually.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label
            htmlFor="ref"
            className="mb-1 block text-[12px] font-medium text-muted-foreground"
          >
            Campaign ref (optional)
          </label>
          <Input
            id="ref"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="e.g. june-retarget-v2"
          />
        </div>
      </div>

      <div className="space-y-2">
        {CHANNELS.map((channel) => (
          <div
            key={channel}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
          >
            <span className="w-20 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
              {channel}
            </span>
            <code className="flex-1 truncate text-[12px] text-foreground/80">
              {buildUrl(channel)}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => copy(channel)}
            >
              Copy
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
