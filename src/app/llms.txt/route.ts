import { siteConfig, siteUrl } from "@/config/site";
import { formatEventDateLong } from "@/lib/events";
import { createAnonClient } from "@/lib/supabase/anon";

export const revalidate = 3600;

export async function GET() {
  const supabase = createAnonClient();
  const { data } = await supabase
    .from("events")
    .select("slug, title, scheduled_at, subtitle, is_past")
    .eq("is_published", true)
    .eq("is_past", false)
    .order("scheduled_at", { ascending: true });

  const upcoming = (data ?? [])
    .map(
      (e) =>
        `- [${e.title}](${siteUrl}/events/${e.slug}) — ${formatEventDateLong(
          e.scheduled_at
        )}${e.subtitle ? `. ${e.subtitle}` : ""}`
    )
    .join("\n");

  const body = `# ${siteConfig.name}

> ${siteConfig.description}

Empowered Careers is a closed-loop talent network for mid-to-senior tech professionals. Candidates are assessed and scored, then matched to exclusive roles that don't appear on public job boards. The public surface is the marketing site and the live events program; the job board itself is private.

## Primary

- [Home](${siteUrl}/): What Empowered Careers is and who it serves.
- [Live sessions](${siteUrl}/events): Free, expert-led sessions on resume strategy, interview prep, and the hiring market.
- [About](${siteUrl}/about): About Empowered Careers.
- [Sign up](${siteUrl}/login): Create an account to get a free ATS score and access the private network.

## Upcoming sessions

${upcoming || "_No sessions currently scheduled._"}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
