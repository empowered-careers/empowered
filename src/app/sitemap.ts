import type { MetadataRoute } from "next";

import { siteUrl } from "@/config/site";
import { createAnonClient } from "@/lib/supabase/anon";

export const revalidate = 3600;

const STATIC_PATHS: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "monthly", priority: 1 },
  { path: "/events", changeFrequency: "weekly", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/team", changeFrequency: "monthly", priority: 0.5 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map(
    ({ path, changeFrequency, priority }) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    })
  );

  const supabase = createAnonClient();
  const { data } = await supabase
    .from("events")
    .select("slug, updated_at")
    .eq("is_published", true);

  const eventEntries: MetadataRoute.Sitemap = (data ?? []).map((e) => ({
    url: `${siteUrl}/events/${e.slug}`,
    lastModified: e.updated_at ? new Date(e.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...eventEntries];
}
