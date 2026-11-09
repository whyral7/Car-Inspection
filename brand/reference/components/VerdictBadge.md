# VerdictBadge

The result of one inspection point or an area, always as a word plus a glyph so it never depends on colour alone.

- `tm-verdict` plus `--pass` (Good, check glyph), `--attention` (Fair, alert glyph), `--fail` (Poor, cross glyph) or `--na`.
- The same badge carries summary verdicts: "Non-accidental", "Major accident", "Flood-affected".
- Pass green and fail red are close in lightness, so the word and glyph are required, not optional.
- Never use `accent` or `highlight` for a verdict: olive means "brand", "action" and "certified", sandstone means "worth noticing", neither means "good". Pass is a blue-green so it never reads as olive.

## Spec

| Variant | Fill | Word and glyph | Glyph |
| --- | --- | --- | --- |
| pass | `verdict-pass-bg` | `verdict-pass-fg` | check |
| attention | `verdict-attention-bg` | `verdict-attention-fg` | circle alert |
| fail | `verdict-fail-bg` | `verdict-fail-fg` | cross |
| na | `verdict-na-bg` | `verdict-na-fg` | none |

Size: `verdict-height` (28px), padding `verdict-padding` (0 10px 0 8px), gap `verdict-gap` (6px), radius `verdict-radius`, font `verdict-font` (SemiBold 13), glyph `verdict-icon` (14px). Not interactive: no hover or focus state.

The Sandstone call-out (`tm-highlight`) is a separate badge: `highlight-badge-bg` with `highlight-badge-fg` (ink, 9.9:1), `highlight-badge-height` (24px), font `highlight-badge-font` (Bold 12). On the Paper page (`bg`) add `tm-highlight--on-bg`, which draws a 1px `highlight-badge-border` edge.
