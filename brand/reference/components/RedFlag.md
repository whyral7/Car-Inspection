# RedFlag

A banner for findings that override the score: red for "do not proceed" and safety, amber for "check before you buy".

- `tm-flag` (red) or `tm-flag tm-flag--amber`; glyph, a one-line title stating the fact, and one line saying what to do.
- Red flags sit at the top of the report summary, above the score. Use `role="alert"` only when it appears during the inspection, not on a static report.

## Spec

| Variant | Fill | Glyph |
| --- | --- | --- |
| red (default) | `flag-fail-bg` | `flag-fail-icon`, cross |
| amber (`--amber`) | `flag-attention-bg` | `flag-attention-icon`, circle alert |

Padding `flag-padding` (16px), gap `flag-gap`, radius `flag-radius` (14px), glyph `flag-icon` (24px). Title `type-title-sm` in `flag-title`; body `type-body-sm` in `flag-body`. Not interactive.
