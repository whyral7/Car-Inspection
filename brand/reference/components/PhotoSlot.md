# PhotoSlot

A tile in the guided photo grid, labelled with its angle, in one of four states: empty, uploading, done, needs retake.

- Grid: `.tm-photos` (auto-fills tiles of at least 104px, 4:3).
- Empty: dashed `border-control`, camera glyph, angle name. Uploading: `--busy` with a progress bar and percent. Done: the photo with a pass tick. Retake: `--retake` with the reason ("blurry", "wrong angle").
- Tapping any tile opens the camera for that angle; tapping a done tile offers retake or view.

## Spec

Tiles are 4:3, at least `photo-min` (104px) wide, gap `photo-gap`, radius `photo-radius`, padding `photo-padding`, label `photo-font` (SemiBold 12/16), glyphs `photo-icon` (20px).

| State | Edge | Fill | Label |
| --- | --- | --- | --- |
| empty | `photo-border-width` dashed `photo-border` | `photo-bg` | `photo-fg`, camera glyph |
| uploading (`--busy`) | solid `photo-busy` | `photo-bg`; bar `photo-track` filled with `photo-busy` to `--value` | `photo-busy` with percent |
| done (`--done`) | none | the photo (`--car` stand-in: `photo-fallback`) under a scrim from `photo-scrim-top` to `photo-scrim-bottom` | `on-photo`; tick disc `photo-ok-bg` with `photo-ok-fg` |
| retake (`--retake`) | `border-2` `photo-retake-fg` | `photo-retake-bg` | `photo-retake-fg` with the reason |
| focus | 2px `focus-ring` outline | | |

Set the upload percentage with `style="--value: 62%"` on the bar's `<i>`.
