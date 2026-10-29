# Treadmark design system

Direction **A, "Clear Teal"**: calm and crisp, with one accent colour, plenty of white space and a strong type hierarchy. Cards are white with soft shadows, not borders. The bar to aim for is a well-made banking app, not a template.

- Tokens: [`app/tokens.css`](../app/tokens.css), a Tailwind v4 `@theme` block.
- Components: [`components/ui`](../components/ui), imported from `@/components/ui`.
- The PDF and the WhatsApp preview image can't use Tailwind. They read the same values from [`lib/report/colors.ts`](../lib/report/colors.ts); keep the two in step.

Before and after screenshots, phone and desktop, are in [`design-system/`](design-system/).

## Tokens

| Group | Tokens | Rule |
|---|---|---|
| Accent | `brand-50 … brand-900` (700 = `#0f5e58`) | The only accent: primary buttons, links, progress, selection. |
| Text | `ink`, `ink-muted`, `ink-subtle` | `ink` for anything people must read. `ink-muted` for secondary text (7.7:1). `ink-subtle` for captions only (5.6:1). |
| Surfaces | `surface` (white cards), `canvas` (page), `sunken` (insets, tracks), `line` (hairlines), `line-strong` (input outlines, 3:1) | |
| Status | `success-*`, `warning-*`, `danger-*` | Status only, never decoration. |
| Type | `text-display` 32, `text-title` 24, `text-heading` 18/600, `text-body` 16, `text-small` 14, `text-caption` 12 | One `title` per screen. Section headings use `heading`. |
| Radius | `rounded-chip` 8, `rounded-control` 12, `rounded-card` 16, `rounded-sheet` 24 | Badges and plates · buttons and inputs · cards · sheets. |
| Elevation | `shadow-card`, `shadow-raised`, `shadow-bar`, `shadow-sheet`, `shadow-focus` | Cards have a shadow and no border. Nothing uses blur. |
| Motion | `ease-standard`; 150ms by default; `animate-fade-in`, `animate-rise-in` (200ms), `animate-sheet-in` (250ms), `animate-pop` | Reduced motion is respected. |
| Spacing | Tailwind 4px steps, used as 8px rhythm: 2, 4, 6, 8, 12 | Odd steps only to nudge an icon against its label. |

Font: Geist, self-hosted (`public/fonts`, 28 KB for Latin, plus a ₹ subset). Hindi falls back to the phone's Devanagari font.

## Components

| Component | Use for |
|---|---|
| `Button`, `LinkButton`, `TextButton` | `primary` (one per screen), `secondary`, `ghost`, `danger`, `danger-ghost`. Sizes `sm` 44px, `md` 48px, `lg` 56px. `loading` shows a spinner; `disabled` turns grey. |
| `Field`, `SelectField`, `TextAreaField`, `FormError`, `FieldMessage` | Label, input, then a hint or an error with an icon. Always pass `inputMode`, `autoComplete` and `enterKeyHint`. |
| `Card`, `CardHeader`, `ListCard`, `ListRow` | The one surface. Tones (`warning`, `success`…) are for status only. `ListRow` with `href` makes the whole row tappable. |
| `Badge` | Small status label; `dot` adds a coloured dot, so status doesn't rest on text colour alone. |
| `PageHeader`, `StepHeader`, `BackLink` | The top of every screen. `StepHeader` adds "Step N of 4" and the four-part indicator for photos, damage notes, checklist and report. |
| `StickyBar` | The main action, in thumb reach. Sits at the bottom of the screen even on short pages, and publishes `--sticky-bar-height` for toasts and scroll padding. |
| `BottomSheet`, `ConfirmSheet` | Editing in context (damage notes), and confirming anything destructive or paid. Built on `<dialog>`: focus trap, Esc and backdrop close it. |
| `Toast` / `useToast()` | Success after an action, errors that don't belong to a field, and Undo. One at a time, above the sticky bar. |
| `EmptyState` | What a list shows when it's empty: what it is, why it's empty, and the one thing to do. |
| `ProgressBar`, `Skeleton`, `PageSkeleton` | Progress with an accessible name; loading placeholders for `loading.tsx`. |
| `Segmented`, `Switch` | Big radio groups (checklist answers, severity) and on/off settings. |

## Patterns

- **Every async action has three states.**
  - Loading: a spinner on the button.
  - Success: a toast, or the screen moving on.
  - Error: `FormError` or a field error, plus an offline-aware message.
- **Destructive or paid actions** confirm in a `ConfirmSheet`, or use an Undo toast when undo is cheap (deleting a note).
- **Forms people fill in at the car keep a draft.**
  - Uncontrolled forms use `useFormDraft(key, formRef)`.
  - Controlled forms use `readDraft` and `saveDraft`.
  - The draft is cleared on save or cancel.
- **Inspection screens call `<RememberStep>`,** so the home screen can offer "Pick up where you left off".
- **Redirects that need a confirmation** add a query flag (`?saved=1`), and the page shows it with `<FlashToast>`.
