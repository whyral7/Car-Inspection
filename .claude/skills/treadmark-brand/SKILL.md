---
name: treadmark-brand
description: Treadmark's brand rules for this app. Use whenever you build or change UI, screens, components, the report page or PDF, emails, the landing page, marketing copy, app icons or any user-facing text, in English or Hindi.
---

# Treadmark brand

Treadmark should look like the stamp at the end of a proper inspection: measured, official, impossible to fake. Ink on paper, olive only where something is certified or actionable, evidence before claims. Everything here comes from the Treadmark Brand Style Guide; the files in `brand/` are the source of truth.

## Where things are
- Tokens: `brand/tokens/treadmark-tokens.css` (all CSS variables, light + dark), mapped onto Tailwind v4 utilities by `treadmark-tailwind-v4.css`, imported in `app/globals.css`. Type classes (`type-label`, `type-heading-1` ...) and font mapping: `treadmark-base.css`. W3C token JSON for design tools: `design-tokens.json`.
- Fonts: `brand/next/fonts.ts` (next/font/local from `brand/fonts/web`: Martel Sans incl. Devanagari, IBM Plex Mono). The PDF and link previews read the TTFs in `assets/fonts` via `lib/report/brand-assets.ts`.
- Score: `lib/score.ts` (`conditionScore`, `scoreBand` = brand grade, `scoreBars`). Labels in `lib/strings.ts` (`publicReport.bands`).
- Icons: `components/icons.tsx` (square-ended, 2px). Never use emoji in the UI.
- PDF and link previews: `lib/report/pdf.tsx`, `lib/report/og-image.tsx`, `app/(site)/opengraph-image.tsx`; their hex values live only in `lib/report/colors.ts` (the tokens resolved for light).
- Logos and icons: `public/brand/`, `public/icons/`, sources in `brand/logos`, `brand/icons`. Rules: `brand/reference/logo.md`.
- Component specs (variants, sizes, states, tokens): `brand/reference/components/*.md`; reference CSS in `reference-styles.css`; HTML previews beside them.
- Voice and copy: `brand/reference/voice-profile.md`. Brand book: `brand/reference/brand-book.md`. Token architecture: `brand/reference/tokens.md`.
Read the relevant reference file before building a component or writing copy.

## Non-negotiables
1. **No raw values.** No hex, rgb or Tailwind default colours; no hand-set font sizes or families. Use brand utilities (`bg-surface`, `text-text-muted`, `border-border-control`, `bg-button-primary-bg`, `text-pass`) or `var(--token)`, and `type-*` classes for text. Components use their component tokens (`--button-*`, `--input-*`, `--verdict-*`) as the specs say.
2. **Colour roles.** Olive (`accent`) = action, selection, certified. One primary button per screen. Sandstone (`highlight`) = at most one badge per screen, always with `on-highlight` ink text; on `bg` add a 1px `border-control` edge. Never olive or sandstone for a verdict.
3. **Verdicts** use only the `verdict-*` / pass / attention / fail tokens and always show a word and a glyph (`CheckIcon`, `AlertIcon`, `CrossCircleIcon`). Text on solid fills uses the `on-*` token, never plain white.
4. **Score:** out of 10 with one decimal (`formatScore`) and the grade word from `scoreBand`, with the five `scoreBars`. No stars, no percentages, never coloured as a verdict.
5. **Type:** Martel Sans for everything, IBM Plex Mono for readings, prices, plates, IDs and codes. Inputs at 16px or more. No other fonts, no italics (Martel Sans has none).
6. **Logo:** use the SVG files, never retype "Treadmark" as a logo. Small lockup (plain ring) in app headers and anywhere the symbol is under 64px; reverse on dark; ink-only for black-and-white print. Never recolour, stretch, shadow or box it.
7. **Bilingual:** every user-facing string lives in `lib/strings.ts` (Hindi is planned there); layouts must leave room for Hindi (about 1.5x line height). Mark Hindi elements `lang="hi"`.
8. **Accessibility:** text 4.5:1, controls and focus 3:1 (the tokens already pass in both themes; don't invent new pairs). Tap targets at least 44px (`min-h-11`). Visible focus ring on every interactive element. Respect reduced motion.
9. **Dark mode** comes free from the tokens. The app is pinned to light (`data-theme="light"` on `<html>`) until every screen is checked in dark; a section can opt into the dark ground with `data-theme="dark"` (see the landing page). Never write `dark:` colour overrides by hand.
10. **Voice:** fact, then action. Numbers over adjectives. Sentence case, no exclamation marks, no emoji, no banned words (voice-profile.md). Claim only what was inspected, with the real checkpoint count.

## Before you finish any UI or copy change
- Run `npm run brand:check` and fix every finding (or mark a deliberate exception with `// brand-check-ignore` and say why).
- Check the screen at 360px wide, in light and dark, in English and Hindi.
- Name any new pattern that the specs don't cover, so the owner can add it to the style guide.
