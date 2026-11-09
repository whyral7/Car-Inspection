# Tokens

Treadmark's tokens come in three layers. Each layer only points at the one below it, so a colour is decided once and a theme switch or a rebrand changes one layer, not every screen.

```
Primitive   raw values          olive-600 #556B1F · space-4 16px · font-size-15
   ↓
Semantic    what it means       accent → olive-600 (light) / olive-300 (dark)
   ↓
Component   where it is used    button-primary-bg → accent
```

## The three layers

| Layer | Examples | Where it lives | Change it when |
| --- | --- | --- | --- |
| Primitive | `olive-50`…`olive-950`, `sand-*`, `ink-*`, `paper-*`, `teal-*`, `orange-*`, `red-*`, `space-*`, `radius-*`, `font-size-*`, `icon-*` | `tokens.json` | The brand itself changes. Rare. |
| Semantic | `bg`, `surface`, `text`, `accent`, `highlight`, `pass`, `on-pass`, `border-control`, `focus-ring`; `gutter`, `type-label` | colours in `tokens.json` (one value per theme); layout and type composites in `components/bundle.css` | A theme changes, or a meaning moves to a different colour. |
| Component | `button-primary-bg`, `input-border-focus`, `verdict-pass-fg`, `photo-ok-fg`; `button-height`, `verdict-padding` | colours in `tokens.json`; sizes in `components/bundle.css` | One component needs to differ from the rest. |

Rules:

- Screens and components never use a primitive or a raw value. `components/bundle.css` reads only component tokens and a few semantic ones (`gutter`, `stack-gap`, `focus-ring`), and passes the design-system skill's token validator with no violations.
- Semantic colours carry a Light and a Dark value. Component colours point at a semantic token, so they follow the theme without a dark value of their own.
- Primitive scales keep every brand value exactly. Steps marked "held in reserve" are derived from the brand values in OKLCH and are not used by any semantic token yet. Promote one to a semantic token before using it.
- Sizes and type cannot alias in `tokens.json`, so the semantic and component dimension tokens are CSS variables built from the primitives with `var()`, in a generated block at the top of `components/bundle.css`.

## Naming

`{component}-{part}-{state}`: `button-primary-bg-hover`, `input-border-error`, `seg-na-fg-on`. Text or icons on a fill take `on-{fill}`: `on-accent`, `on-highlight`, `on-pass`. Scales use 50 to 950 for colour, the 4px step for spacing (`space-1-5` is 6px), and the pixel size for type (`font-size-15`).

## Type composites

Components set type with one shorthand variable, for example `font: var(--type-label)`, which is built as SemiBold, 14px on a 20px line, in Martel Sans.

| Token | Value | Use |
| --- | --- | --- |
| `type-display-xl` | ExtraBold 48/52 display | Hero |
| `type-display-lg` | ExtraBold 36/40 display | Report score heroes |
| `type-heading-1` | Bold 28/34 display | Screen titles |
| `type-heading-2` | Bold 22/28 display | Section titles, the car name |
| `type-body-lg` | Regular 18/26 | Capture instructions |
| `type-body` | Regular 16/24 | Default text, inputs |
| `type-title-sm` | SemiBold 15/20 | Row titles, buttons, grades |
| `type-label` | SemiBold 14/20 | Labels, rating options |
| `type-body-sm` | Regular 14/20 | Flag body |
| `type-caption`, `type-caption-strong` | Regular or SemiBold 13/18 | Metadata, evidence line |
| `type-overline` | SemiBold 12/16 | Step count (uppercase, `tracking-caps`) |
| `type-micro` | SemiBold 11/16 | Criticality label |
| `type-reading`, `type-code`, `type-code-strong`, `type-code-sm` | IBM Plex Mono 15/20, 13/18, 12/16 | Readings, plates, IDs |

## States

Every interactive component defines the same states, in this priority: disabled, loading, active, focus, hover, default. Colour changes ease over `dur-fast` (120ms), and a press scales to `scale-press` (0.98). Focus is always a `focus-ring-width` (2px) solid `focus-ring` outline with a `focus-ring-offset` (2px) gap. Disabled is `opacity-disabled` (0.45) with no pointer events. Each component's README has its variant, size and state table.

## Contrast

All 117 checked pairs pass in both themes: text 4.5:1, control edges, focus rings and graphics 3:1. The pairs include every component token pair, for example `button-primary-fg` on `button-primary-bg-hover` and `photo-ok-fg` on `photo-ok-bg`. White labels on photos sit on a scrim that keeps 4.5:1 even over a white car.

## Using the tokens in the app

The `Code` asset group has the same three layers for the PWA:

- `tokens.css`: every token as a CSS variable. Light by default; dark with `data-theme="dark"` on `<html>`, or from the phone's setting unless `data-theme="light"` is set. Import it once in the global stylesheet.
- `tailwind.preset.cjs`: a Tailwind preset mapping semantic and component colours, olive, sand and ink scales, spacing, radius, shadow, font and duration to those variables (`bg-surface`, `text-text-muted`, `bg-button-primary-bg`, `p-4`, `rounded-md`).
- `design-tokens.json`: the same tokens in the W3C design-token format (primitive, semantic, component and dark), for Figma plugins and token tools.

All three were generated from this system's `tokens.json` on 9 Nov 2026, together with the block at the top of `components/bundle.css`. Don't edit them by hand: after a token changes on this page, regenerate them so the app matches.
