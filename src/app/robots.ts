import type { MetadataRoute } from "next";

import { siteUrl } from "@/config/site";

const PRIVATE_PATHS = [
  "/dashboard",
  "/profile",
  "/resume",
  "/job-board",
  "/assessment",
  "/assessments",
  "/pipeline",
  "/linkedin",
  "/content",
  "/onboarding",
  "/admin",
  "/employer",
  "/employer-not-linked",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/api",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      { userAgent: "GPTBot", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: "ClaudeBot", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: "PerplexityBot", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: "Google-Extended", allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
