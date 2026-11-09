# TextField

A label above, the input, then one line of help or error below. Never a placeholder in place of a label.

- Structure: `label.tm-field` > `.tm-field__label`, `input.tm-input`, `.tm-field__help`. Error state: add `tm-field--error` and rewrite the help line as the fix.
- Registration and chassis numbers: add `tm-input--plate` (mono, uppercase, spaced) with `autocapitalize="characters"`.
- Measured values: wrap in `.tm-input-wrap` with a `.tm-unit` (km, mm, µm, V) and the right `inputmode` (`numeric`, `decimal`).
- Inputs are 16px text so iOS does not zoom, 48px tall, and use `border-control` so the edge passes 3:1.
- Errors explain and fix: "That's deeper than a new tyre (about 8 mm). Check the reading."

## Spec

Reads only `input-*` and `field-gap` tokens.

| Part | Token |
| --- | --- |
| Height, padding x, radius | `input-height` (48px), `input-padding-x` (16px), `input-radius` (10px) |
| Value font | `input-font` (Regular 16/24); plate: `input-plate-font` (Mono Medium 20/24, tracked `tracking-wide`) |
| Label, help, error | `input-label` on `type-label`; `input-help` on `type-caption`; `input-error` |
| Unit suffix | `input-unit` on `input-unit-font` |

| State | Border | Fill |
| --- | --- | --- |
| default | `input-border-width` `input-border` | `input-bg` |
| hover | `input-border-hover` | `input-bg` |
| focus | `input-border-focus`, plus the 2px `focus-ring` outline | `input-bg` |
| error | `input-border-width-error` (2px) `input-border-error`; help line becomes the fix, in `input-error` | `input-bg` |
| disabled | `input-border` at `button-disabled-opacity` | `input-disabled-bg` |
