# Empowered Careers — MDX Blog Engine + Chat-Authoring Skill

> Created: June 2026
> Scope: File-based MDX blog (SSG, SEO-wired) + a custom Claude Agent Skill that lets non-technical authors publish posts from a chat
> Related:
>
> - `docs/ec-seo-visibility-plan.md` — **completed**; the blog extends that sprint's SEO artifacts (sitemap, `llms.txt`, `<JsonLd>`) by appending, not rewriting.
> - `docs/context.md` — business/brand context the authoring skill draws on for voice.
> - `src/app/(public)/` — the public route group the blog lives in.

---

## Context

The blog is currently a stub (`src/app/(public)/blog/page.tsx` → "Content coming soon"). The chosen approach is **MDX, files-in-repo** — picked specifically so content can be authored through Claude and flow through normal git/PR review, with no external CMS API or auth in the loop.

**Goal:** a real MDX blog (SSG, SEO-wired) **plus** a custom Claude **Agent Skill** that lets non-technical authors (e.g. Lauren) write a post from a chat.

**Confirmed decisions:**

- **Authoring surface:** claude.ai + **GitHub connector** — the skill drafts the MDX and opens a PR on `3lokai/empowered`. The skill is portable, so it also works in Claude Code via the `gh` CLI.
- **Publish gate:** PR → **Vercel preview deploy** → manual merge. CI (`type-check` + lint + `build`) already runs on PRs, so a malformed post fails the PR build and never reaches prod; the author gets a preview URL to review first.

---

## Key facts from exploration (these shape the approach)

- **Next.js 16.2.6 + React 19.2.0, built with `--turbopack`.** → Use `next-mdx-remote/rsc` (compiles MDX inside a Server Component, bundler-agnostic) rather than `@next/mdx` (bundler-loader-coupled, riskier under Turbopack).
- **Tailwind v4**, and `@tailwindcss/typography` is **not installed** even though `prose` is already used on the event detail page (`src/app/(public)/events/[slug]/page.tsx`). Installing it also fixes that latent gap. In v4 it's enabled via `@plugin "@tailwindcss/typography";` in `src/app/globals.css`.
- No `content/` directory exists yet. Brand tokens: `--font-display` (Cormorant Garamond) for headings, `--font-body` (Montserrat). Card idiom: `border border-border bg-card`, `max-w-5xl`/`max-w-3xl`, label `text-[12px] uppercase tracking-wide text-muted-foreground`.
- Deploy = Vercel native GitHub integration → PRs get preview URLs automatically.
- `.claude/skills/` exists (`shadcn`), mirrored at `.agents/skills/`. **No GitHub MCP configured.** `zod` is available (used in `env.ts`).

---

## Dependency / coordination note — RESOLVED

The SEO sprint (`docs/ec-seo-visibility-plan.md`) is **complete**, and the integration points the blog extends are verified present (exact shapes below):

- **`src/components/seo/json-ld.tsx`** — `JsonLd({ data: Record<string, unknown> })`, renders a single `<script type="application/ld+json">`. Reuse it for `BlogPosting` — do **not** add a second component.
- **`src/app/sitemap.ts`** — dynamic, `export const revalidate = 3600`. `/blog` is already a `STATIC_PATHS` entry; events are fetched via `createAnonClient` from `@/lib/supabase/anon` and spread after the static entries. The blog **appends** per-post `/blog/<slug>` entries from `getAllPosts()` to the returned array.
- **`src/app/llms.txt/route.ts`** — a `GET` returning `text/markdown` with `## Primary` and `## Upcoming sessions` (events via `createAnonClient`). The blog **adds** a `## Writing` section listing published posts.

The file-based blog reader (`src/lib/blog.ts`) does not need Supabase — it reads `content/blog`. Use `createAnonClient` from `@/lib/supabase/anon` only if a future variant needs DB access.

---

## Workstream A — MDX content layer

1. **Add deps:** `next-mdx-remote`, `gray-matter`, `remark-gfm`, `rehype-slug`, `@tailwindcss/typography`, `reading-time`. (Optional, deferred: `rehype-pretty-code` + `shiki` for code highlighting — career content rarely needs it; skip in v1.)
2. **Content dir:** `content/blog/<slug>.mdx`. One file per post; filename = slug.
3. **Frontmatter schema** — a `zod` schema + inferred type in `src/types/blog.ts` (file-based frontmatter is **not** a Supabase type, so it correctly lives outside `db.ts`):
   - `title` (string), `description` (string — meta + cards), `author` (string, default `"Lauren Laughlin"`), `publishedAt` (ISO date), `updatedAt` (ISO date, optional), `tags` (string[], optional), `cover` (URL string, optional), `draft` (boolean, default `false`).
4. **Reader utils** — `src/lib/blog.ts` (add `import "server-only"`):
   - `getAllPosts()` — read `content/blog`, parse + **zod-validate** each frontmatter (throw a clear error naming the offending file → fails the PR build, protecting prod), drop `draft` posts in production, sort by `publishedAt` desc, attach `readingTime`. Returns metadata only.
   - `getPostBySlug(slug)` — returns `{ meta, content }` (raw MDX string) or `null`.
   - `getAllSlugs()` — for `generateStaticParams`.

## Workstream B — Rendering + UI

5. **Typography plugin:** add `@plugin "@tailwindcss/typography";` to `src/app/globals.css`; verify `prose` now styles both the blog and the existing event detail page.
6. **MDX component map** — `src/components/blog/mdx-components.tsx`: brand-styled `h2/h3`, `p`, `ul/ol`, `a` (internal → `next/link`), `blockquote`, `img` (styled, lazy), `code`/`pre`. Passed to `<MDXRemote components={...} />`.
7. **Blog index** — replace `src/app/(public)/blog/page.tsx` (Server Component): `getAllPosts()` → grid of `<BlogCard>`; empty state matching the events page tone. Keep existing metadata + canonical.
8. **Blog card** — `src/components/blog/blog-card.tsx`: title, description, date, reading time, tags; card idiom from events/landing.
9. **Post page** — `src/app/(public)/blog/[slug]/page.tsx` (Server Component, **SSG**):
   - `generateStaticParams()` from `getAllSlugs()`.
   - `generateMetadata()` from frontmatter: title, description, `alternates.canonical: /blog/<slug>`, `openGraph.images` via `/api/og?title=…&description=…` (or `cover` when set), article OG type + `publishedTime`.
   - Render header (title in `font-display`, author + date + reading time) → `<MDXRemote source={content} components plugins>` (`remark-gfm`, `rehype-slug`).
   - `notFound()` if missing, or `draft` in production.
   - Emit **`BlogPosting` JSON-LD** via the shared `<JsonLd>` (headline, description, datePublished, dateModified, author, image, publisher=Organization).
10. **Images:** v1 keeps it simple for chat authoring — `cover` is an optional URL; inline images via markdown URLs. If covers are hosted on Supabase Storage / external, add `images.remotePatterns` to `next.config.ts` for that host; otherwise authors omit `cover` and the post falls back to the generated `/api/og` card. No upload tooling in v1 (documented as a known limitation).

## Workstream C — SEO wiring (extend the SEO-sprint artifacts)

11. **Sitemap:** in `src/app/sitemap.ts`, append `getAllPosts()` → `/blog/<slug>` entries (`lastModified` from `updatedAt ?? publishedAt`).
12. **llms.txt:** in `src/app/llms.txt/route.ts`, add a "Writing" section listing published posts (title + URL + one-line description).
13. **(Covered in B9)** per-post `BlogPosting` JSON-LD + OG image.

## Workstream D — The chat-authoring Skill

14. **`.claude/skills/blog-post/SKILL.md`** (mirror to `.agents/skills/blog-post/` to match the `shadcn` setup). `user-invocable: true`. The skill encodes the full author-from-chat flow:
    - **Interview** the author (Lauren-friendly): topic, angle, audience, 3–5 key points, tone, CTA.
    - **Draft** the body in MDX in EC's brand voice (reference `docs/context.md` + `src/config/site.ts`); propose `title`, `description`, `tags`, and a kebab-case `slug` (unique vs existing `content/blog/*`).
    - **Emit** validated frontmatter (the zod schema from Workstream A) + the MDX file at `content/blog/<slug>.mdx`. Default `draft: false` (the PR gate is the safety net, not the draft flag).
    - **Open a PR:** branch `blog/<slug>`, commit only the new MDX file, PR titled `Blog: <title>` with a body summarizing the post and noting the Vercel preview. Use the **GitHub connector** on claude.ai, or `gh` in Claude Code (the skill documents both paths).
    - **Hand off:** tell the author the PR is open, a preview will appear on Vercel shortly, and to ping the reviewer to merge/publish.
    - **Guardrails:** touch only `content/blog/<slug>.mdx`; never edit components/config; enforce slug uniqueness; image guidance (URL or omit); a short style/voice guide; what to do if the build fails.
15. **Optional dogfood:** the skill is also how _we_ author the first real post.

---

## Files

**Create:** `content/blog/.gitkeep` (+ a sample `content/blog/welcome.mdx` for verification), `src/types/blog.ts`, `src/lib/blog.ts`, `src/components/blog/mdx-components.tsx`, `src/components/blog/blog-card.tsx`, `src/app/(public)/blog/[slug]/page.tsx`, `.claude/skills/blog-post/SKILL.md` (+ `.agents/skills/blog-post/` mirror).

**Modify:** `src/app/(public)/blog/page.tsx` (stub → real index), `src/app/globals.css` (typography plugin), `package.json` (deps), `next.config.ts` (image `remotePatterns`, only if remote covers used), `src/app/sitemap.ts` + `src/app/llms.txt/route.ts` (append blog entries — coordinate with the SEO sprint).

---

## Verification

1. `npm install`, then `npm run type-check`, `npm run check` (lint + prettier), `npm run build` — all clean.
2. With a sample `content/blog/welcome.mdx`: `/blog` lists it; `/blog/welcome` renders with correct `prose` styling and brand fonts.
3. View source on the post: `BlogPosting` JSON-LD present; `<link rel="canonical">` = `/blog/welcome`; OG image URL resolves.
4. `/sitemap.xml` and `/llms.txt` include the post; a `draft: true` post is **absent** from both and 404s in a production build.
5. Validate the post URL in Google Rich Results / schema.org validator — `BlogPosting` passes.
6. **Skill dry-run:** invoke `blog-post` in Claude Code, confirm it interviews → writes the MDX → opens a PR (branch `blog/<slug>`) touching only the new file, and that the PR triggers a Vercel preview. Then repeat the connector path on claude.ai once the repo is connected.

---

## Open items to confirm at build time

- Connect `3lokai/empowered` to claude.ai's GitHub connector (one-time, Lauren-facing prerequisite).
- Where blog cover images are hosted (drives whether `next.config.ts` needs `remotePatterns`); v1 default is "URL or omit → OG fallback."
- Reviewer/owner who merges blog PRs (named in the skill's hand-off message).
