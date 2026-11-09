# ReportHeader

The top card of the shared report: who made it, which car, the score, and the headline verdicts.

- Report ID in mono, top right; the issuer's logo top left (the dealer's own logo when they have one, else the Treadmark small lockup, which suits the header's 26px height).
- Mask the registration in the public link (`MH12AB••34`); show it in full only to the owner.
- Facts line: fuel, transmission, odometer in mono, owner count.
- Below the score, at most three VerdictBadges; details live further down the report.
- One `tm-highlight` (sandstone) at most, for a single call-out such as "Within estimate".

## Spec

| Part | Token |
| --- | --- |
| Card | fill `report-bg`, radius `report-radius` (14px), `report-shadow`, padding `report-padding` |
| Issuer row | logo (`tm-report__logo`) at `logo-height-header` (26px); divider `report-divider`; ID `type-code-sm` in `report-id` |
| Car and facts | `type-heading-2`; facts `type-caption` in `report-facts`, values `type-code-strong` in `text` |
| Plate | `plate-height` (26px), `plate-padding-x`, `plate-border-width` (1.5px) `plate-border`, `plate-radius` (4px) |
| Score and verdicts | ScoreMeter, then at most three VerdictBadges |
