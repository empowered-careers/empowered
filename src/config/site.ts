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
    "AI career tools with a real recruiter's judgment: score your resume and LinkedIn, rebuild them in your voice, and add real coaching when you want it.",
  keywords: [
    "Empowered Careers",
    "resume score",
    "resume rewrite",
    "LinkedIn optimization",
    "career coaching",
    "interview prep",
    "executive job search",
  ],
  author: {
    name: "Empowered Careers",
  },
  logo: "/favicon.ico",
} as const;
