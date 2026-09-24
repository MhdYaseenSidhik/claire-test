# Design direction — claire-dashboard

This document states the visual direction of the dashboard and the tokens that
express it. **Every component reads from the tokens; a literal colour, size,
radius, or duration in a component stylesheet is a defect against this
document.** The single source of truth is [`src/tokens.css`](src/tokens.css),
imported once at the top of [`src/index.css`](src/index.css).

## Direction

**Linear/Vercel-calm** — a quiet, legible enterprise analytics surface. Neutral
surfaces, generous whitespace, one indigo accent that carries primary emphasis
and focus, semantic colours reserved for status. Depth is subtle (1px borders,
soft shadows), typography does the hierarchy work, and dark mode is designed —
not inverted.

## Typeface

| Token | Value | Use |
|-------|-------|-----|
| `--font-sans` | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | All UI text |
| `--font-mono` | `ui-monospace, SFMono-Regular, Menlo, monospace` | Inline `code` |

System UI stack by design — fast, native, and never the browser-default serif.

**Weights:** `--weight-regular` 400 · `--weight-medium` 500 ·
`--weight-semibold` 600 · `--weight-bold` 700.

**Letter spacing:** `--tracking-tight` −0.02em (headings, KPI values) ·
`--tracking-wide` 0.04em (table headers) · `--tracking-caps` 0.08em (eyebrow).

**Line height:** `--leading-tight` 1.2 · `--leading-normal` 1.55 (body).

## Type scale

A 16px base. Hierarchy comes from size **and** weight **and** colour.

| Token | Size | Role |
|-------|------|------|
| `--text-2xs` | 0.75rem (12px) | Eyebrow, caption, hint, table header |
| `--text-xs` | 0.8rem (~13px) | Chips, meta, secondary hints |
| `--text-sm` | 0.875rem (14px) | Secondary body, table cells, panel titles |
| `--text-base` | 1rem (16px) | Body |
| `--text-md` | 1.125rem (18px) | Reserved |
| `--text-lg` | 1.4rem (~22px) | Section headings (`h2`) |
| `--text-xl` | 1.75rem (28px) | KPI values |
| `--text-2xl` | 2rem (32px) | Page title (`h1`) |

## Spacing scale

A 4px base. Gaps and padding come from the scale, never ad hoc.

`--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 ·
`--space-5` 20 · `--space-6` 24 · `--space-8` 32 · `--space-10` 40 ·
`--space-12` 48 · `--space-16` 64 (px).

**Layout:** content sits in a centred `--content-max` (960px) column with
`--space-6` page padding; text is capped at 60ch and never runs edge to edge.

## Palette

One accent, neutral surfaces, semantic status colours. Body text contrast
≥ 4.5:1 in both modes. Dark values re-tune the same tokens — depth comes from
lighter surfaces, not heavier shadows.

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `--bg` | `#f6f7fb` | `#0f1117` | Page background |
| `--surface` | `#ffffff` | `#171a22` | Cards, panels, chips |
| `--border` | `#e4e7ee` | `#262b36` | 1px dividers, control borders |
| `--text` | `#1a1d29` | `#eef0f5` | Primary text |
| `--muted` | `#5b6172` | `#9aa1b1` | Secondary text, captions |
| `--accent` | `#4f46e5` | `#8b83ff` | Primary action, focus ring, chart line |
| `--ok-bg` / `--ok-fg` | `#e7f7ee` / `#0f7a45` | `#10261a` / `#4ade80` | Success status |
| `--err-bg` / `--err-fg` | `#fdecec` / `#b42318` | `#2a1315` / `#f87171` | Error status |
| `--warn-bg` / `--warn-fg` | `#fef4e6` / `#b25e09` | `#2a2210` / `#fbbf24` | Warning status |

The accent is used sparingly — primary/active controls, focus rings, chart
strokes, and a 10–12% tint (`color-mix`) for active-row and inline `code`
backgrounds. At most five hues appear on any one screen.

## Radii

`--radius-sm` 5px (code, small chips) · `--radius-md` 10px (status banners) ·
`--radius-lg` 14px (cards, panels) · `--radius-pill` 999px (chips, bars).

## Elevation

Two soft levels; dark mode uses lighter surfaces for depth rather than stronger
shadows.

- `--shadow` — resting elevation for cards and panels.
- `--shadow-lg` — reserved for overlays/popovers.

## Motion

Quiet and purposeful. `--duration` 0.15s, `--ease` `ease`, combined as
`--transition`. Only hover/active transitions on interactive controls (chips);
nothing bounces and nothing moves without user intent.

## Focus & accessibility

Every interactive control has a visible focus state: a 2px `--accent` outline
with 2px offset (`:focus-visible`). Numerics use `tabular-nums` for aligned
columns. Section landmarks carry `aria-labelledby`; status regions use
`role="status"`.

## Component inventory

Built and styled entirely from tokens in `src/index.css`:

| Component | Classes | States |
|-----------|---------|--------|
| App shell | `.app`, `.app__eyebrow`, `.app__header`, `.app__lede`, `.app__main`, `.app__footer` | — |
| KPI card | `.cards`, `.card`, `.card__label`, `.card__value`, `.card__hint` | ready |
| Status banner | `.status`, `.status--loading/ok/error/empty` | loading, ok, error, empty |
| Section | `.section`, `.section__head`, `.section__sub` | — |
| Panel | `.panels`, `.panel`, `.panel__head`, `.panel__title`, `.panel__meta` | — |
| Trend chart | `.chart`, `.chart__line`, `.chart__dot`, `.chart__empty` | data, empty |
| Region split | `.split`, `.split__row`, `.split__name`, `.split__bar`, `.split__fill`, `.split__value`, `.split__share` | — |
| Filter chip | `.chip`, `.chip--active` | default, hover, focus-visible, active |
| Data table | `.table`, `.table__num`, `.table__row--active` | default, active row |

## Rules

1. Components read tokens only — no literal colour, size, radius, or duration.
2. New tokens are added to `src/tokens.css` and documented here in the same change.
3. Dark values are set alongside light in the `prefers-color-scheme` block; never leave a colour token light-only.
4. Extend the existing pattern (CSS variables + BEM-ish class names). Do not introduce a second styling system (Tailwind, CSS-in-JS) without changing this document first.
