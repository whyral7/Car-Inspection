# Button

One `tm-btn--primary` per screen, for the step the screen exists for; everything else is secondary or ghost.

- Classes: `tm-btn` plus one of `--primary`, `--secondary`, `--ghost`, `--danger`; add `--lg` for the bottom bar and `--block` for full width.
- Label: verb first, sentence case, says what happens ("Publish report", not "Submit"). Add the cost when it spends a credit: "Publish report · 1 credit".
- Loading: keep the button's width, add `tm-spinner`, set `aria-disabled="true"`, and say what is happening ("Analysing photos…").
- Minimum height is `tap-min` (44px); `--lg` is 52px for the sticky bottom bar.
- Danger is outlined, never a red fill, and always asks for confirmation or offers undo.

## Spec

Reads only `button-*` tokens. Every row passes 4.5:1 for the label in both themes.

| Variant | Background | Label | Border | Hover / pressed background |
| --- | --- | --- | --- | --- |
| primary | `button-primary-bg` | `button-primary-fg` | none | `button-primary-bg-hover` |
| secondary | `button-secondary-bg` | `button-secondary-fg` | `button-secondary-border` | `button-secondary-bg-hover` |
| ghost | transparent | `button-ghost-fg` | none | `button-ghost-bg-hover` |
| danger | `button-danger-bg` | `button-danger-fg` | `button-danger-border` | `button-danger-bg-hover` |

| Size | Height | Padding x | Font | Icon |
| --- | --- | --- | --- | --- |
| default | `button-height` (44px) | `button-padding-x` (20px) | `button-font` (SemiBold 15/20) | `button-icon` (18px) |
| `--lg` | `button-height-lg` (52px) | `button-padding-x-lg` (24px) | `button-font-lg` (SemiBold 16/20) | `button-icon` |

| State | What changes |
| --- | --- |
| hover | Background to the variant's `-bg-hover` over `dur-fast`. |
| active | Same background as hover, scaled to `button-press-scale` (0.98). |
| focus | `focus-ring-width` (2px) solid `focus-ring`, offset `focus-ring-offset` (2px). |
| disabled | `button-disabled-opacity` (0.45), no pointer events. Use `disabled` or `aria-disabled="true"`. |
| loading | `tm-spinner` before the label, `aria-disabled="true"`, label says what is happening. Width stays the same. |

State priority: disabled, then loading, active, focus, hover, default.
