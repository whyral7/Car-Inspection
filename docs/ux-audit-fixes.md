# UI/UX audit: what was fixed

Branch `ux-improvements`. This follows [ux-audit.md](ux-audit.md).

**Direction:** Option A "Clear Teal" everywhere in the app, with Option B touches on what buyers see: a yellow number plate and a score badge on the public report, the PDF and the WhatsApp preview.

## Top 10

| # | Issue | What changed |
|---|---|---|
| 1 | Work lost on flaky 4G | Photos and checklist answers are saved to an on-phone outbox (IndexedDB) first. They sync on their own when the signal comes back, and survive a reload. An offline banner shows on every app screen, and each item shows "waiting" or "saved". The service worker serves an offline page instead of the browser's dinosaur. |
| 2 | Public report didn't open with the car; dealer name cut off | The report opens with a swipeable photo hero. Below it are a summary card (yellow plate, title, score badge, one-line summary, inspected date, disclaimer) and a "How the score works" section. The dealer's name wraps instead of being cut off. There is a sticky Call / WhatsApp bar. The WhatsApp preview image and PDF page 1 now show the lead photo. |
| 3 | 80 taps for photos; guidance lost | Photos auto-advance after each save, with "Saved · Retake". A quality check (dark, bright, blurry) offers a retake before upload. Once the 12 required photos are done, the next step is shown. The gallery option is a small link, so it isn't tapped by mistake. |
| 4 | Flow bounced back to the car page | The car page puts the next step's button at the top, with a 4-step stepper. Each screen ends in "go to next step" (photos → damage notes → checklist → report). Home shows progress per car. |
| 5 | Damage-notes screen too long; "all reviewed" while still checking | Notes are grouped: to review, accepted, and a folded group for photos with nothing found. The bottom bar follows the AI state ("Checking 8 of 20…", "Accept all N and continue", "Continue without waiting"). Delete has a 6-second Undo. The edit and delete buttons are compact. |
| 6 | No loading feedback; dead-end errors | Loading skeletons, branded error and 404 pages, a report-not-found page with links to the sample and home, and a global error page. |
| 7 | One-tap logout; header cut off; breaks at large text | Log out moved to Profile and asks for confirmation. The header name wraps to 2 lines, and the credits badge moves to its own line at large text sizes (checked at 200%). |
| 8 | Score said 10.0 before anything was checked; colours changed between screens | The score is hidden until the checklist starts, then marked provisional ("3 of 19 checked") until it's finished. All screens use one set of band colours (good, fair, needs work). |
| 9 | Placeholders and dealer-only copy on public pages | The WhatsApp contact shows only if a number is set. The footer falls back to the app name while the legal-name placeholder is still in place. Copy depends on who made the report (dealer, owner or buyer). The sample report uses 20 drawn photos. |
| 10 | English only, with jargon | There is a full Hindi translation (`lib/strings.hi.ts`) with an English / हिन्दी toggle on the login and profile screens. The choice is stored in a `lang` cookie, falling back to the phone's language. Plain words replace jargon (e.g. "Damage notes", "How to check"). |

## Full list (by screen)

- **Global:**
  - Design tokens: teal 700/800, ink, canvas and line.
  - Radius scale; no blur.
  - Inline icon set, so there are no new dependencies.
  - Buttons:
    - 48 px or larger.
    - A grey disabled state.
    - A WhatsApp variant that meets contrast rules.
  - Red-700 error text, with focus moved to the first error.
  - Scroll padding, so sticky bars never cover a focused field.
  - Reduced-motion support.
  - Every axe WCAG 2 AA violation fixed. Re-checked on 17 screens in English and Hindi, at 360 px and 1280 px.
- **Landing:** "Who it's for" cards, FAQ, plate styling, drawn previews, and the WhatsApp link only when one is set.
- **Login:**
  - The logo links home.
  - The language toggle.
  - The code is read from the SMS automatically (WebOTP on Android Chrome).
  - The code is checked as soon as the 6th digit is entered.
  - A wrong code is cleared.
  - Bigger tap targets on the links.
- **Onboarding / profile:**
  - Checks your answers before you submit.
  - A hint for each "I am a" option.
  - A live preview of the report header.
  - A credits card and the credit history.
  - A request to delete your account.
  - Logout with confirmation.
- **Home:**
  - A compact credits row, or an "out of credits" card.
  - An empty state with the 4 steps.
  - Each car shows a thumbnail, plate, score chip and progress line.
  - Search and filters appear once you have 6 or more cars.
  - "Share again" on published cars.
  - An install prompt.
- **Add / edit / delete car:**
  - A number-plate-style input.
  - An RC summary with "Looks right, save car".
  - Car details can be edited.
  - Delete asks for confirmation and removes the stored photos.
- **Photos:** see Top 10 #1 and #3. Also small thumbnails, and an "N waiting to upload" count.
- **Checklist:**
  - A 2×2 answer grid.
  - "How to check" for every item.
  - "Mark the other N OK", with a confirmation.
  - Saves in batches with automatic retry.
  - Finish goes straight to the report.
- **Report preview and publish:**
  - A sticky publish / buy / share bar.
  - A preview of the WhatsApp card.
  - WhatsApp, other apps (`navigator.share`), copy link, open report and PDF.
  - The price estimate shows which step it's on and the time taken, plus how many searches are left today.
- **Public report:**
  - A full-screen photo viewer with swipe, zoom to 250% and the time each photo was taken.
  - Section order: findings, price, photos, checklist, documents.
  - Share in the header.
- **Credits:** a balance chip, a help link, and clearer failure messages ("no money was taken").
- **PWA:**
  - An offline fallback page.
  - Static files are cached.
  - Manifest shortcuts.
  - Icons redrawn in the new teal.

## Must-have features from section 3

All 8 are done:

- Offline drafts with background sync.
- Resume a half-done inspection from home.
- Auto-advance and a photo quality check.
- Hindi toggle.
- Photo-first report and a photo in the WhatsApp card.
- Native share sheet.
- Loading skeletons, error pages and an offline page.
- Edit and delete car.

From the "Next" list, these are also done:

- "Mark the rest OK".
- Search and filter.
- Install prompt and shortcuts.
- Photo timestamps.

## Deferred (needs a decision, content or a bigger build)

- **In-app camera with an outline overlay.** The photo step still uses the phone camera app.
- **Damage markers on photos** (AI boxes and pins).
- **Single-report or 3-pack pricing.** This is a pricing decision; packs live in `lib/credits`.
- **Real sample photos.** The sample report uses drawings.
- **Social proof** (testimonials, report counts). This needs real content.
- **The `BUSINESS` placeholders** in `lib/site.ts`: legal name, address, WhatsApp and email.
- **Hindi for the PDF, the WhatsApp preview image, the landing page and the legal pages.** These stay English for now; the PDF and preview font has no Devanagari.
- **The SMS template for WebOTP.** In Supabase, the OTP SMS must end with `@<your-domain> #<code>` for Android to fill the code by itself (see the README).
- **Flagging photos picked from the gallery by their date** (EXIF).
- **iOS splash screens and dark mode.**
- **Native-speaker review of the Hindi** before a wide launch.
- **Report view counts, re-inspection and compare, voice notes, team accounts.**
