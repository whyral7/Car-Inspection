# Treadmark design system in the app

The look is the **Treadmark brand**: ink on paper, olive only where something is certified or actionable, one sandstone note, evidence before claims. The rules are not in this file. They live in:

- the brand kit: [`brand/`](../brand) (tokens, component specs, logo rules, voice profile);
- the working rules for anyone changing UI or copy: [`.claude/skills/treadmark-brand/SKILL.md`](../.claude/skills/treadmark-brand/SKILL.md);
- `npm run brand:check`, which fails the build on raw colours, default Tailwind colours, pill shapes, off-brand fonts and banned copy.

This file says how the app applies them. Every component in every state is on `/dev/brand` (off in production unless `SHOW_BRAND_PAGE=1`).

## Where things are

| What | Where |
|---|---|
| Tokens and Tailwind mapping | `brand/tokens/*`, imported in [`app/globals.css`](../app/globals.css). Screens use brand utilities (`bg-surface`, `text-text-muted`, `text-pass`) and `type-*` styles only |
| Motion | `app/globals.css`: `animate-fade-in`, `animate-rise-in`, `animate-sheet-in`, `animate-pop`, timed on `--dur-fast` and `--dur-base`. Reduced motion keeps the spinner |
| Fonts | `brand/next/fonts.ts` (Martel Sans, IBM Plex Mono); the PDF and previews read `assets/fonts` |
| Logo | [`components/logo.tsx`](../components/logo.tsx) over the SVGs in `public/brand`. Never typed, boxed or recoloured |
| Shared components | [`components/ui`](../components/ui), plus `components/brand-header.tsx`, `score-meter.tsx`, `verdict-badge.tsx`, `red-flag.tsx`, `plate.tsx` |
| PDF and link preview colours | `lib/report/colors.ts`, the only place hex values are allowed besides `lib/config.ts` |

## Components

| Component | Brand spec | Notes |
|---|---|---|
| `Button`, `LinkButton`, `TextButton` | Button | 44px; 52px inside the bottom bar. Danger is outlined. `loading` keeps the width and shows a spinner |
| `Field`, `SelectField`, `TextAreaField` | TextField | 48px, 16px text. `plate` sets a number plate; `unit` adds km, mm, V |
| `Segmented` | ChecklistItem rating | Joined segments; a chosen rating takes its tint. `columns` stacks long options |
| `StickyBar` | BottomBar | The one primary action. Optional step count, title and progress. Publishes `--sticky-bar-height` |
| `Badge`, `VerdictBadge`, `SeverityBadge` | VerdictBadge | Ratings always carry a word and a glyph. `tone="highlight"` is the one sandstone badge a screen may have |
| `ScoreMeter`, `ScoreChip` | ScoreMeter | Ink number, five bars, grade word. Never a rating colour |
| Photo tile in `photo-capture.tsx` | PhotoSlot | Empty, uploading, done, needs retake |
| `RedFlag` | RedFlag | Red or amber, a fact then an action, with the evidence photo when there is one |
| Header card in `report-view.tsx` | ReportHeader | Issuer, report ID in mono, masked plate, facts, score, at most three rating badges |
| `Plate` | plate tokens | IBM Plex Mono, 1.5px ink outline |
| `BrandHeader` | App and PWA | Small lockup + हिंदी toggle on every screen |

Built from semantic tokens because the book has no spec yet (proposed to the style guide in [the audit](ux-audit.md#8-brand-book-audit-and-port-round-5)): `Toast`, `BottomSheet`, `ConfirmSheet`, `Skeleton`, `EmptyState`, `Switch` (drawn as a checkbox: no pills), `StepHeader`, `ProgressBar`, `Card` tones.

## Rules the app adds on top of the book

- **One primary button per screen, in the bottom bar.** Everything else is secondary or ghost. My cars shows "Continue" when an inspection is open, otherwise "Add car".
- **Rating colours are for ratings only.** Progress, prompts, "saved" and "accepted" are ink. Information sits on `accent-tint` with ink text.
- **Numbers that are readings are mono:** plates, kilometres, prices, credit counts, report IDs.
- **Every async action has three states:** a spinner on the button with a label that says what is happening, then a toast or the next screen, or an error that says the fix.
- **Destructive or paid actions confirm** in a `ConfirmSheet`, or offer Undo in a toast.
- **Forms filled in at the car keep a draft** (`lib/draft.ts`); inspection screens remember the step (`lib/resume.ts`).
- **Nothing that changes how good a car looks is shown early.** The score waits for the damage notes to be reviewed; every flagged check is named above the score.
- **Public means masked.** `forPublic()` in `lib/report/view.ts` hides the middle of the registration on the public page, PDF and link preview.
- **Hindi is first-class.** Strings in `lib/strings.hi.ts` have the same shape as English (a test fails otherwise); overlines drop capitals in Hindi; layouts are checked at 360px in both languages.

Before and after screenshots from the earlier passes are in [`design-system/`](design-system/).
