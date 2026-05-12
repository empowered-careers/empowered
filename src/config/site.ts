/**
 * Canonical public URL. Set `NEXT_PUBLIC_SITE_URL` in production (e.g. https://yoursite.com).
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const siteConfig = {
  url: siteUrl,
  name: "Empowered Careers",
  shortName: "Empowered",
  description:
    "A curated talent network for mid-to-senior tech professionals — assessed, scored, and matched to exclusive roles.",
  keywords: [
    "Empowered Careers",
    "tech careers",
    "senior engineer jobs",
    "talent network",
    "exclusive roles",
    "interview prep",
    "resume coaching",
  ],
  author: {
    name: "Empowered Careers",
  },
} as const;
