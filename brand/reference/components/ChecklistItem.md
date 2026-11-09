# ChecklistItem

One inspection point: name, a short how-to hint, criticality, and a four-way rating the inspector can hit with a thumb.

- Rating is `.tm-seg` with four buttons (`good`, `fair`, `poor`, `na`) using `aria-pressed`; selected states use the verdict tints.
- Below Good shows `.tm-check__evidence` and blocks submission until a photo and note are added.
- Hints are one practical sentence in the inspector's terms ("Pull the dipstick…"); readings go in the hint in mono units.
- Criticality label: "Critical", "Panel", or blank for ordinary points.

## Spec

| Part | Token |
| --- | --- |
| Row | `check-padding` (16px), `check-gap` (12px), fill `check-bg`, divider `check-divider` |
| Name, hint, criticality | `check-name-font`; `type-caption` in `check-hint`; `check-crit-font` uppercase, `tracking-caps` |
| Rating control | height `seg-height` (44px), radius `seg-radius`, edge `seg-border`, dividers `seg-divider`, font `seg-font` |
| Evidence line | `type-caption-strong` in `check-evidence` |

| Rating state | Fill | Label |
| --- | --- | --- |
| unselected | `seg-bg` | `seg-fg` |
| Good selected | `verdict-pass-bg` | `verdict-pass-fg` |
| Fair selected | `verdict-attention-bg` | `verdict-attention-fg` |
| Poor selected | `verdict-fail-bg` | `verdict-fail-fg` |
| N/A selected | `seg-na-bg-on` | `seg-na-fg-on` |
| focus | 2px `focus-ring` outline on the focused option | |
