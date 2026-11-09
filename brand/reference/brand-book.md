Treadmark inspects used cars and turns the inspection into a score, a price and a signed report people believe. The brand should look like the stamp at the end of a proper inspection: measured, official and impossible to fake. It never sells; it shows the evidence and states the result.

The mark is a tyre seen side-on, its tread cut into the ring, with an olive-khaki tick breaking out through the top right. Ring and letters share one stroke weight, and the tick runs parallel to the arm of the K, so symbol and wordmark read as one piece.

## Using this system

- Tokens come in three layers: primitive (`olive-600`, `space-4`), semantic (`accent`, `surface`) and component (`button-primary-bg`). Screens use semantic tokens; components use their own component tokens; nothing uses a primitive or a raw value directly. The Tokens section explains the layers and how the app imports them.
- Colours are semantic tokens with a Light and a Dark theme. Build screens from `bg`, `surface`, `surface-raised`, `text`, `text-muted`, `text-subtle`, `border`, `border-control` and `accent`. The `brand-*` tokens are for the logo, the app icon, marketing and print, not product UI.
- `accent` is Olive Khaki in Light and Olive Light in Dark (dark olive disappears on a dark ground). It means action, selection and "certified"; never use it to say "good".
- `highlight` is Sandstone, the secondary colour: at most one per screen, for an offer badge, a "new" tag or one key number. Text on it is always `on-highlight` (ink, 9.9:1). It is tonal with Paper, so it reads best on `surface`, olive and ink grounds; on `bg` add `tm-highlight--on-bg` for a 1px edge. Never text, never a verdict.
- Text and icons on any solid fill use that fill's `on-` token (`on-accent`, `on-highlight`, `on-pass`, `on-attention`, `on-fail`), never plain white: in Dark the fills turn light and the `on-` tokens turn ink.
- Verdicts use only `pass`, `attention` and `fail` with their `-tint` grounds, and always carry a word and a glyph (see VerdictBadge).
- Focus: a 2px solid `focus-ring` outline with a 2px offset on every interactive element.
- Components are styled in `components/bundle.css` with the `tm-` prefix and read only component tokens. Each component's README has a variant, size and state table naming them. There is no JavaScript bundle; the app builds its own React components to match these previews.

## Typography

- **Martel Sans** (Google Fonts; designed by Dan Reynolds and Mathieu Réguer) is the one family for headings and text. It is the wordmark's own typeface, so the UI and the logo match. ExtraBold for `display-xl` and `display-lg`, Bold for headings, Regular for body, SemiBold for labels.
- **Martel Sans Devanagari** (the same Google Fonts family) sets all Hindi (`hindi-heading`, `hindi-body`) at the same weight and height as the Latin. Give Devanagari about 1.5x line height.
- **IBM Plex Mono** sets every measured value and identifier: `reading` for µm, mm, V and km; `code` for OBD codes, registration and chassis numbers. Its equal-width digits keep report columns aligned.
- Inputs are never smaller than 16px.
- Indian number formatting: ₹4,85,000 and "₹5.60–5.85 lakh"; kilometres with commas, 48,320 km.
- Avoid slab serifs, rounded "friendly" fonts, condensed racing fonts and scripts.

## Colour

- Light is the default theme; Dark follows the phone. Every text token passes 4.5:1 on the grounds its note names, in both themes; `border-control` and `focus-ring` pass 3:1.
- Roughly 70% paper, 20% ink, 8% olive, 2% sandstone on any page. Paper (`bg`) is warmer than white, like certificate stock. Olive and sandstone together read as an inspector's field kit: khaki drill and sand.
- Olive and the Pass green are close in lightness but apart in hue (olive is yellow-green, Pass is blue-green). Verdicts always carry a word and a glyph, so they never rely on colour alone.
- Inspectors work outdoors in sun. Keep text `text` or `text-muted` on key screens; reserve `text-subtle` for metadata.

## Space, shape and elevation

- 4px base: `space-1` to `space-16`. Screen gutter is `space-4`; sections are `space-8` apart. Lay out siblings with gap.
- Corners: `radius-sm` badges, `radius-md` buttons and inputs, `radius-lg` cards, `radius-xl` sheets. Nothing is pill-shaped except progress tracks.
- Shadows are quiet and warm: `shadow-1` resting cards, `shadow-2` the bottom bar and menus, `shadow-3` sheets and dialogs. A flat list of rows needs no shadow, only `border`.
- Every control is at least `tap-min` (44px). The primary action lives in the BottomBar, within thumb reach.

## Motion

- Short and functional: `dur-fast` for presses and ticks, `dur-base` for sheets and toasts, `dur-slow` once, for the score filling on the report.
- No bouncing, no confetti. A tick appearing is the only celebration.
- Respect `prefers-reduced-motion`: drop to instant changes.

## Iconography

- Lucide icons (MIT licence) at 2px stroke with square line ends and sharp corners, echoing the square-cut ends of the logo's tick: 24px in UI, 16px inside badges, in `currentColor`.
- Inspection glyphs are fixed: the tick for Good, triangle-alert for Fair, circle-x for Poor, camera for "photo needed".
- Car-specific icons (tread depth, paint meter, OBD port, chassis number) are drawn in the same style.
- No emoji in the product or the report.

## Imagery

- Documentary evidence: real Indian cars in real places, a tread gauge in a groove, a paint meter on a panel. Defects shown exactly as they are; photos in reports are unedited, with time and place stamped in `caption` style.
- No stock handshakes, showroom renders, heavy filters or colour washes.
- Patterns (tread grooves, dots) are for marketing grounds and empty states, at low contrast. Never behind text in the product, and never in the report.

## Voice

- Plain, specific and calm. State what was found and what to do: "Minor oil seepage at the valve cover. No active leak."
- Numbers over adjectives: "Tread 2.1 mm, replace within 3,000 km", not "tyres are worn".
- "You" for the user; "we" only for Treadmark the company, sparingly.
- Sentence case everywhere, including buttons. No exclamation marks.
- Never blame the seller or the car owner. Describe the car, not the person.
- Hindi is first-class: write it natively, not as a word-for-word translation. Use everyday words (गाड़ी, not वाहन).
- Claim only what was inspected: "No structural repair found", never "accident-free". No "100% guaranteed", "best in India", or "certified" without a seal.
- No fear-selling ("Don't get cheated"), no unsourced social proof ("trusted by thousands"), no tech filler ("AI-powered", "seamless").
- Questions only in forms, never as marketing hooks. Parentheses only for a unit, range or standard.
- One call to action, verb first, saying what happens: "Download report", "Verify this certificate".
- Tagline: "Every car, properly checked." · Hindi: "हर गाड़ी की पक्की जाँच".
- The full voice profile, with channel notes and ready-to-use copy, is the "Brand voice" tab of the Treadmark Visual Identity Brief.

## Logo, icon and assets

See the Logo section for construction, clear space, minimum sizes, the small version and misuse. Files: `assets/Logos` (outlined SVG, every lockup and colourway, plus the certificate seal), `assets/AppIcons` (PWA, Android, iOS, Play Store, favicons), `assets/Patterns`, `assets/Marketing` (link preview, Play Store feature graphic, profile picture).
