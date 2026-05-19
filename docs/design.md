# Empowered Careers — Design System

Source of truth: `src/app/globals.css`. This doc summarizes the tokens, fonts, and conventions wired into Tailwind v4 + shadcn/ui (new-york).

## Brand Principles

- **Editorial, not corporate.** Serif headings paired with a clean geometric sans body.
- **Flat & sharp.** Zero border radius, no shadows. The look is intentional and architectural.
- **High contrast monochrome + one electric accent.** Near-black on warm off-white, with lime as the only "loud" colour.

## Color Palette

Tokens live in `:root` and `.dark` in `src/app/globals.css` and are exposed to Tailwind via `@theme inline`. Values are stored as `oklch()`; hex equivalents are listed for reference.

### Core swatches

| Role          | Hex       | OKLCH                  | Usage                            |
| ------------- | --------- | ---------------------- | -------------------------------- |
| Primary black | `#111111` | `oklch(0.12 0 0)`      | Foreground, primary bg, headings |
| Lime accent   | `#CCFF00` | `oklch(0.93 0.23 120)` | CTAs, focus rings, accent bg     |
| Surface       | `#F9F9F7` | `oklch(0.98 0.002 94)` | Background, card, popover        |
| Border        | `#E5E5E5` | `oklch(0.91 0 0)`      | Borders, inputs                  |
| Muted text    | `#999999` | `oklch(0.63 0 0)`      | Secondary/muted foreground       |
| Body text     | `#666666` | `oklch(0.47 0 0)`      | Default `body` colour            |

### Semantic tokens (light)

| Token                     | Value                       | Notes                                             |
| ------------------------- | --------------------------- | ------------------------------------------------- |
| `--background`            | `#F9F9F7` surface           | Page bg                                           |
| `--foreground`            | `#111111`                   | Default text on bg                                |
| `--card` / `--popover`    | `#F9F9F7`                   | Same as bg — separation via border, not elevation |
| `--primary`               | `#111111`                   | Black-bg button                                   |
| `--primary-foreground`    | `#CCFF00` lime              | Text on primary button                            |
| `--secondary` / `--muted` | near-white                  | Subtle surfaces                                   |
| `--muted-foreground`      | `#999999`                   | Tertiary text                                     |
| `--accent`                | `#CCFF00` lime              | Lime-bg CTA                                       |
| `--accent-foreground`     | `#111111`                   | Text on lime CTA                                  |
| `--destructive`           | `oklch(0.577 0.245 27.325)` | Error red                                         |
| `--border` / `--input`    | `#E5E5E5`                   | Hairlines                                         |
| `--ring`                  | `#CCFF00` lime              | Focus outline                                     |

### Dark mode

Deep charcoal base with lime as primary. The roles swap intentionally — in dark mode lime becomes `--primary` (lime button with black text), rather than the inverse used in light.

| Token                     | Value                |
| ------------------------- | -------------------- |
| `--background`            | `#111111`            |
| `--foreground`            | `#F9F9F7`            |
| `--card` / `--popover`    | `oklch(0.17 0 0)`    |
| `--primary`               | lime `#CCFF00`       |
| `--primary-foreground`    | `#111111`            |
| `--secondary` / `--muted` | `oklch(0.22 0 0)`    |
| `--border`                | `oklch(1 0 0 / 12%)` |
| `--input`                 | `oklch(1 0 0 / 15%)` |

### Chart palette

`--chart-1` is brand lime; `--chart-2..5` provide brand-adjacent accents for data viz (teal, navy, amber, orange in light; lime, green, orange, violet, magenta in dark).

### Sidebar

`--sidebar*` tokens mirror the core palette so the sidebar reads as part of the surface, separated only by a hairline border. Active items use lime accent.

## Typography

Two font families, loaded via `next/font/google` in `src/app/layout.tsx` and exposed as CSS variables.

| Variable         | Family                                        | Role                     |
| ---------------- | --------------------------------------------- | ------------------------ |
| `--font-display` | Cormorant Garamond (300–700, normal + italic) | All headings (`h1`–`h6`) |
| `--font-body`    | Montserrat (300–700)                          | Body, UI, forms, buttons |
| `--font-mono`    | Geist Mono (via `--font-geist-mono`)          | Code                     |

### Heading defaults (set in `@layer base`)

- Font: Cormorant Garamond, Georgia fallback
- Color: `#111111` (`--foreground`)
- Weight: `600`
- Letter spacing: `-0.01em`
- Italics are first-class — the display font is loaded with italic variants for editorial flourishes.

### Body defaults

- Font: Montserrat, system-ui fallback
- Color: `#666666` (note: deliberately lighter than `--foreground` for body copy)
- OpenType features: `rlig`, `calt` enabled

### Code

`code` inline: `bg-muted` chip, `text-sm`, mono. `pre` blocks: `bg-muted`, padded, horizontally scrollable.

## Shape & Elevation

- **Radius: `0px` everywhere.** `--radius`, `--radius-sm/md/lg/xl` all collapse to zero. Sharp corners are non-negotiable brand.
- **No shadows.** `box-shadow: none !important` is set on `*` in base layer. Depth is conveyed via borders and surface contrast only.

## Focus & Interaction

- `*:focus-visible` → 2px outline, 2px offset, lime ring (`--ring`).
- Form fields on focus add a `ring-2 ring-ring ring-offset-2` against `--background`.
- Buttons, role=button, inputs, textareas, selects all carry `transition-colors duration-200`.
- Links transition colour on hover, hover state lands on `--primary`.
- Selection: `bg-primary/20 text-primary-foreground`.

## Scrollbar

Custom WebKit scrollbar: 2px wide track in `--muted`, thumb in `--muted-foreground/30` rounded full, deepens to `/50` on hover.

## Tables, Lists, Quotes, HR

- Tables: full width, collapsed borders, `th` bold on `bg-muted/50`, cells padded `p-4`, bottom-bordered rows.
- `ul`/`ol`: `space-y-1`, relaxed line-height on `li`.
- `blockquote`: 4px left border in `--primary`, italic, muted-foreground text.
- `hr`: `--border`, vertical margin `my-6`.

## Sonner Toasts

Defined in `@layer components` with per-type bg/border/icon tokens:

| Type    | Border             | Icon                |
| ------- | ------------------ | ------------------- |
| success | `--chart-2/50`     | `--chart-2` (teal)  |
| error   | `--destructive/50` | `--destructive`     |
| warning | `--chart-4/50`     | `--chart-4` (amber) |
| info    | `--chart-3/50`     | `--chart-3` (navy)  |

All toasts sit on `--background` with the relevant tint at `/5` opacity — flat, framed, never floating.

## Usage Conventions

- **Always reference tokens, never hex.** Use `bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`, etc. Tailwind v4 picks these up from `@theme inline` automatically.
- **Two CTA styles only:**
  - _Primary_: `bg-primary text-primary-foreground` → black button, lime text (light) / lime button, black text (dark).
  - _Accent_: `bg-accent text-accent-foreground` → lime button, black text (both modes). Reserve for the single most important action on a screen.
- **Cards = bordered surfaces, not raised.** `bg-card border border-border` with sharp corners. No `shadow-*` utilities — they'll be neutralised by the global `box-shadow: none`.
- **Headings always serif.** Don't override `font-family` on `h1`–`h6`. For decorative emphasis, prefer italic Cormorant over a different family.
- **Focus is lime.** Never restyle focus rings to a neutral — the lime ring is part of the brand signal.
- **Dark mode is a class, not a media query.** `@custom-variant dark (&:is(.dark *))` — `ThemeProvider` toggles the `.dark` class on `<html>`.

## File Map

| What              | Where                                                                         |
| ----------------- | ----------------------------------------------------------------------------- |
| All design tokens | `src/app/globals.css`                                                         |
| Font loading      | `src/app/layout.tsx` (Cormorant Garamond + Montserrat via `next/font/google`) |
| Theme switching   | `src/components/providers/theme-provider.tsx` (mounted in root layout)        |
| shadcn config     | `components.json` (style: `new-york`)                                         |
| Site name/desc    | `src/config/site.ts`                                                          |
