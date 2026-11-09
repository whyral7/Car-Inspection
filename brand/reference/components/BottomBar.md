# BottomBar

The sticky bar at the bottom of every inspection step: where you are, how far along, and the one next action.

- Holds step count (`overline` style), step title, a progress track, and a primary button.
- Pads for the phone's safe area with `env(safe-area-inset-bottom)`; height before the inset is `bottom-bar` (72px).
- Sits on `surface-raised` with `shadow-2` so content scrolls under it.

## Spec

| Part | Token |
| --- | --- |
| Bar | fill `bottombar-bg`, top edge `bottombar-border`, `bottombar-shadow`; padding `bottombar-padding-y` / `bottombar-padding-x` plus the safe-area inset |
| Step count | `type-overline` uppercase in `bottombar-step` |
| Step title | `type-title-sm`, one line, ellipsis |
| Progress | `progress-height` (4px), `progress-radius`, track `progress-track`, fill `progress-fill` |
| Action | one `tm-btn--primary` (default size, or `--lg` when it is the only item) |
