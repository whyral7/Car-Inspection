# Treadmark UI/UX audit

Date: 29 October 2026 · Build: `master` at `4a354b3` · Auditor: Claude (no code changed)

> **Status:** fixed on branch `ux-improvements`. See [ux-audit-fixes.md](ux-audit-fixes.md) for what changed and what was deferred.

## How this audit was done

- I ran the app locally (`next dev`, plus a production build for the speed numbers) against the real Supabase project.
- I used Playwright with Chromium at **360×800** (Android phone, touch, 2× pixels) and **1280×800** (desktop).
- I walked the whole journey as a **brand-new user**. This used a throwaway account that I created for the audit and deleted afterwards.
  - Landing → sign up → profile → add car → 20 photos → AI damage notes → checklist → report → publish → public report → buy credits.
  - I also logged in through the real OTP screens with the test number.
- I forced these states:
  - **Empty** (no cars), **loading** (RC lookup, photo upload, AI analysis, price search), **filled**, **error** (invalid input, wrong OTP, AI failure, price failure, payment failure), **offline** (login, photo upload, checklist, navigation), **0 credits**, and **text at 200%**.
- Tools and measurements:
  - **Accessibility:** automated checks with axe-core 4.10, plus a script that flags tap targets under 44 px.
  - **Speed:** measured on a local production build, throttled to "slow 4G" (1.6 Mbps, 150 ms latency, 4× CPU slowdown).
- Limits:
  - The 20 photos are drawn stand-ins (this sandbox can't download real car photos), so photo file sizes are smaller than real ones.
  - AI results were seeded in the database to avoid API cost. The loading and failure states were produced by intercepting the real requests.
  - Razorpay Checkout and the live `treadmark.vercel.app` site are blocked from this sandbox, so the payment window itself is not shown.
  - The round "N" button in the bottom-left of the screenshots is the Next.js dev indicator. Ignore it.

All screenshots are in [`docs/ux-audit/`](ux-audit/). Names end in `-phone` or `-desktop`. `.jpg` files are full-page captures and `.png` files are what fits on one screen.

### Tap and screen count for the first report

| Step | Screens | Taps (in our app) | Typing | Notes |
|---|---|---|---|---|
| Landing → signed up | 4 (landing, phone, OTP, profile) | 5 | phone, OTP, name, city (+ dealership name) | The login screen says "Log in" even after tapping "Start free". |
| Add car | 2 (number plate, details) | 3 | number plate | RC lookup fills 8 fields; the user only checks them. |
| Photos | 20 guide screens + grid | **80** for 20 photos (open camera, shutter, confirm, Next) · 48 for the 12 required | none | The camera app's shutter and ✓ count as 2 taps on most Android phones. |
| Damage notes | 1 + car page hop | 4 with "Accept all" | odometer if AI missed it | The screen is 5,300 px tall at 360 px wide (20 photo cards). |
| Checklist | 1 | 20 (19 items + Finish) | notes for attention/fail | About 3,800 px of scrolling. It ends on the car page, not the report. |
| Report → publish | car page hop + report | 2–3 | none | The Publish button sits mid-page, under the price card and section toggles. |
| Share | WhatsApp | 3 (Share, contact, send) | none | |
| Buy credits (at 0) | credits page + Razorpay | about 6 | none | |
| **Total, first report** | **about 30 screens** | **about 90 (12 photos) to 120 (20 photos)** | 5–7 fields | The car page is passed through 4 times. |

---

## 1. Top 10 issues, ranked by impact on a real user

### 1. Work is lost or silently unsaved on flaky 4G
- **Screens:** Photos, Checklist (and Damage notes edits)
- **Screenshots:** [`18-photo-upload-retrying-offline-phone.png`](ux-audit/18-photo-upload-retrying-offline-phone.png), [`18-photo-upload-failed-offline-phone.png`](ux-audit/18-photo-upload-failed-offline-phone.png), [`26-checklist-save-failed-offline-phone.png`](ux-audit/26-checklist-save-failed-offline-phone.png)
- **What's wrong:**
  - Each checklist tap is saved on its own. When the connection drops, each item shows a small red "Not saved. Tap to try again." Nothing retries when the network returns.
  - The counter still says "All items checked" and the user can tap Finish. In my run, 4 answers that looked saved (including one with a note) were missing after a reload.
  - Photos that haven't uploaded yet live only in the page's memory. If Android kills the browser tab while the camera app is open, they're gone. That's common on 3–4 GB phones.
  - The upload status says "Connection is slow. Retrying (1/3)…" when the phone is actually offline.
- **Why it matters:** Dealers shoot in basements, yards and parking lots with patchy signal. Losing a photo or answer, or finding out at "Finish", means going back to the car. That is the fastest way to lose trust in the app.
- **Fix:**
  - Save everything (photos, checklist answers, notes, odometer) to a local outbox in IndexedDB first, then sync in the background. Retry automatically on the `online` event.
  - Show one sync banner for the whole inspection, e.g. "3 items waiting for internet". The Finish button should list what's unsynced instead of failing.
  - Say "You're offline" when `navigator.onLine` is false.
- **Effort:** L

### 2. The public report doesn't open with the car, and the dealer's name gets cut off
- **Screen:** Public report `/r/[slug]` (also the preview and the WhatsApp card)
- **Screenshots:** [`34-public-report-phone.png`](ux-audit/34-public-report-phone.png), [`34-public-report-full-phone.jpg`](ux-audit/34-public-report-full-phone.jpg), [`38-share-preview-og.png`](ux-audit/38-share-preview-og.png)
- **What's wrong:**
  - The first screen a buyer sees is a table (fuel, transmission, year), then a long price paragraph. The first photo only appears about 1,500 px down.
  - The dealer's name is cut to "Mehta Car Ba…" by the "Inspection report" chip. Their branding is what they pay for.
  - The WhatsApp link card has no car photo.
  - The sticky "WhatsApp dealer" button wraps onto two lines at 360 px and covers content.
  - Nothing at the top says when or how the car was inspected.
- **Why it matters:** Buyers decide in seconds whether a report looks real. Cars24 and Spinny lead with a big photo carousel, then the score, then highlights. A text-first page reads like a form, not a trustworthy report.
- **Fix:**
  - Put a swipeable photo carousel at the top (front photo first, with a "20 photos" counter).
  - Below it, show a summary card: score, band, number of damage notes, inspection date.
  - Then "Highlights" (best and worst points), then the details.
  - Let the dealer name wrap to 2 lines and move the chip under it.
  - Add the front photo to the OG image.
  - Keep the contact bar to one line ("Call", "WhatsApp").
- **Effort:** M

### 3. 80 taps for photos, and the guidance disappears when the camera opens
- **Screens:** Photo guide and grid
- **Screenshots:** [`17-photo-guide-1-phone.png`](ux-audit/17-photo-guide-1-phone.png), [`18-photo-saved-phone.png`](ux-audit/18-photo-saved-phone.png), [`19-photo-grid-required-done-phone.jpg`](ux-audit/19-photo-grid-required-done-phone.jpg)
- **What's wrong:**
  - Each photo takes 4 taps: Take photo, shutter, confirm in the camera app, then Next. The line drawing and tip are on our screen, not in the camera, so the user frames the shot from memory.
  - Nothing checks the photo before upload: blurry, too dark, or the wrong angle all get uploaded and analysed (and paid for).
  - "Choose from gallery" has the same weight as "Take photo", which invites old or downloaded photos.
- **Why it matters:** This is 70% of all taps in the journey and the part done one-handed, standing next to the car.
- **Fix:**
  - **Now:** move to the next angle automatically 1 second after a photo is saved (with "Undo / Retake").
  - **Now:** run a quick in-browser check for blur and brightness, and offer "Looks blurry, retake?".
  - **Now:** make Gallery a small text link.
  - **Next:** an in-app camera (`getUserMedia`) with the outline overlay and a big shutter in the thumb zone. That cuts photos to 1 tap each.
- **Effort:** S for the "Now" items, L for the in-app camera

### 4. The flow keeps bouncing back to a car page whose main button is below the fold
- **Screens:** Car page, end of Photos, end of Checklist
- **Screenshots:** [`16-car-new-phone.jpg`](ux-audit/16-car-new-phone.jpg), [`20-car-photos-done-phone.jpg`](ux-audit/20-car-photos-done-phone.jpg), [`28-car-inspected-phone.png`](ux-audit/28-car-inspected-phone.png)
- **What's wrong:**
  - The car page shows the number-plate card, then a 7-row "Car details" table, then the score, then the steps. The main button ("Start inspection", "Review damage notes", "Preview and publish report") is at about y = 870–1,000 px on a 800 px screen, so it's never visible without scrolling.
  - After the required photos, the main button is "Back to car", not "Review damage notes".
  - After the checklist, the user lands on the car page, not the report.
- **Why it matters:** Every hop costs 2–4 s on 4G (see issue 6) and a "where do I go now?" moment. First-time users get lost.
- **Fix:**
  - The last button of each step should go straight to the next step: Photos → Damage notes → Checklist → Report.
  - On the car page, put the 4-step progress and the main button at the top. Fold "Car details" into an expandable row.
  - Make the main button sticky at the bottom.
- **Effort:** S

### 5. The damage notes screen is a 5,300 px scroll, and it says "All notes reviewed" while still checking
- **Screen:** Damage notes
- **Screenshots:** [`21-findings-analysing-phone.png`](ux-audit/21-findings-analysing-phone.png), [`21-findings-failed-phone.png`](ux-audit/21-findings-failed-phone.png), [`22-findings-review-full-phone.jpg`](ux-audit/22-findings-review-full-phone.jpg)
- **What's wrong:**
  - Every photo gets a card, even the 16 with "No damage seen", each with a "+ Add a note" link.
  - While the AI is still checking (or after it failed for 3 photos), the bottom bar says "All notes reviewed." and offers a bold "Continue to checklist".
  - "Accept all 4 notes" is the secondary button, below the explanation.
  - Notes don't show where on the photo the damage is.
- **Why it matters:** The point of this screen is to review 3–6 notes. Users scroll past 16 empty cards, may skip the real ones, and can move on before analysis finishes, so the report ends up with fewer notes.
- **Fix:**
  - Group the screen into "Needs your review (4)", "Couldn't check (3) – Try again", and a collapsed "No damage seen (13 photos)".
  - Keep the bottom bar in step with the work: while checking, "Checking 5 of 20…" with Continue disabled or labelled "Continue without waiting". Once checks finish, "Accept all 4 and continue" as the primary button.
  - Next: have the AI return a bounding box and draw it on the thumbnail.
- **Effort:** M

### 6. No feedback while pages load, and dead-end error pages
- **Screens:** Every in-app link, the app 404, offline navigation, report not found
- **Screenshots:** [`39-app-not-found-phone.png`](ux-audit/39-app-not-found-phone.png), [`11-offline-navigation-phone.png`](ux-audit/11-offline-navigation-phone.png), [`04-report-not-found-phone.png`](ux-audit/04-report-not-found-phone.png)
- **What's wrong:**
  - There is no `loading.tsx` or `error.tsx` anywhere. On throttled 4G, app pages took **1.3–3.4 s before the first byte** (table below). During that time the old screen just sits there after a tap, with no progress bar or skeleton, so people tap again.
  - A wrong car link shows Next's default unbranded "404 | This page could not be found." with no way back.
  - Losing signal while navigating shows the browser's own offline page (blank in the headless capture), because the service worker caches nothing.
  - The public "Report not available" page has no link to the home page or a sample.
- **Why it matters:** On slow networks, missing feedback feels like the app is broken. Dead ends make non-technical users close the app.
- **Fix:**
  - Add a `loading.tsx` skeleton per route group and a thin top progress bar.
  - Add a branded `not-found.tsx` and `error.tsx` with "Go to My cars" and "Try again".
  - Add a cached offline page in `sw.js`.
  - Add a "See a sample report" and home link on the report-not-found page.
- **Effort:** S–M

### 7. Header: one-tap Log out, a cut-off name, and it breaks at large text sizes
- **Screens:** Every app page
- **Screenshots:** [`13-home-empty-phone.png`](ux-audit/13-home-empty-phone.png), [`40-text-200-car-phone.png`](ux-audit/40-text-200-car-phone.png), [`40-text-200-checklist-phone.png`](ux-audit/40-text-200-checklist-phone.png)
- **What's wrong:**
  - "Log out" is a top-level button next to the credits badge, in the top-right corner your thumb brushes when scrolling. One stray tap means getting a new OTP in the middle of an inspection.
  - The business name is cut to "Mehta Ca…".
  - At 200% text (a common Android setting for older users):
    - the credits badge covers the avatar and "Log out" runs off the screen;
    - on the car page the number plate is cut to a single letter, "R";
    - the checklist's sticky footer covers half the screen.
- **Why it matters:** Many target users raise system font size. A broken header and an unreadable number plate on every screen look unprofessional and exclude people.
- **Fix:**
  - Move Log out into Profile, with a confirmation.
  - Header: logo or initial, name (allowed to wrap), credits badge.
  - Don't truncate number plates. Let them wrap or shrink to fit.
  - Use `min-height`, not fixed heights, for the sticky bars.
- **Effort:** S

### 8. The condition score says 10.0/10 before anything is checked, and its colour changes between screens
- **Screens:** Car page, report, public report
- **Screenshots:** [`20-car-photos-done-phone.jpg`](ux-audit/20-car-photos-done-phone.jpg), [`28-car-inspected-phone.png`](ux-audit/28-car-inspected-phone.png), [`34-public-report-phone.png`](ux-audit/34-public-report-phone.png)
- **What's wrong:**
  - After the photos, with no notes reviewed and 0 of 19 checklist items, the car page shows a big "10.0/10".
  - The car page always shows the score in brand teal. The report shows the same 6.8 in amber as "Fair condition".
- **Why it matters:** A dealer may screenshot or quote a 10/10 that drops to 6.8 a few minutes later. The score is the single number buyers remember, so it must never look wrong.
- **Fix:**
  - Hide the score until the checklist has been started, or label it "Provisional · 0 of 19 checked".
  - Use the band colour and label everywhere: good, fair, needs work.
- **Effort:** S

### 9. Public pages still have placeholders and dealer-only copy
- **Screens:** Landing, sample report, login, legal footer
- **Screenshots:** [`01-landing-full-phone.jpg`](ux-audit/01-landing-full-phone.jpg), [`02-sample-report-full-phone.jpg`](ux-audit/02-sample-report-full-phone.jpg), [`06-login-empty-phone.png`](ux-audit/06-login-empty-phone.png)
- **What's wrong:**
  - The footer reads "© 2026 [Your registered business name]".
  - The hero says "For used-car dealers in India" and "Why dealers use it", even though signup offers Car owner and Buying a car.
  - The report preview on the landing page and the sample report show grey boxes instead of car photos.
  - The floating "Chat on WhatsApp" button covers the hero preview, and with no number set it opens /contact.
  - The login page has no header or link back home, and says "Log in" to someone who just tapped "Start free".
- **Why it matters:** These are the first screens a new user sees and the pages Razorpay reviews before enabling live payments. Placeholders read as a scam signal.
- **Fix:**
  - Fill `BUSINESS` in `lib/config.ts`.
  - Write audience-aware copy, e.g. "Inspection reports for selling, buying or owning a used car", with three short "For owners / buyers / dealers" cards.
  - Use real photos in the sample report and the landing preview.
  - Title the login screen "Log in or sign up", with the logo linking home.
  - Hide the floating WhatsApp button until a number is set.
- **Effort:** S

### 10. English only, with jargon
- **Screens:** All, especially Checklist, Add car and Credits
- **Screenshots:** [`25-checklist-empty-phone.png`](ux-audit/25-checklist-empty-phone.png), [`14-add-car-empty-phone.png`](ux-audit/14-add-car-empty-phone.png), [`31-credits-0-phone.png`](ux-audit/31-credits-0-phone.png)
- **What's wrong:**
  - There's no language switch.
  - Words like "RC", "PUC", "OTP", "N/A", "Attention", "credits", "variant" and "odometer" are used without explanation.
  - The checklist expects the user to judge "suspension noise" or "clutch slip" with only a one-line hint.
- **Why it matters:** The brief says many users prefer Hindi and aren't very tech-savvy. Strings are already in one file (`lib/strings.ts`), so this is mostly translation work.
- **Fix:**
  - Add a हिन्दी / English toggle on the login screen and in Profile, saved in the profile and a cookie.
  - Use plain words: "OK / Needs attention / Problem / Doesn't apply", "Registration (RC)", "Pollution certificate (PUC)".
  - Add a short "How to check" (?) sheet per checklist item.
- **Effort:** M (structure S, translation M)

---

## 2. Full issue list by screen

Severity: **Critical** (blocks or loses work, or breaks trust), **High** (major friction or confusion), **Medium** (noticeable polish or efficiency), **Low** (nice to fix). Effort: **S** (under ½ day), **M** (1–3 days), **L** (a week or more).

### Global (every screen)

| # | Issue | Sev | Effort |
|---|---|---|---|
| G1 | No offline outbox. Saves fail per item, nothing retries on reconnect, and unsynced state is hidden (Top 1). | Critical | L |
| G2 | No `loading.tsx` skeletons or progress bar. Measured TTFB on slow 4G was 1.3–3.4 s per app page (Top 6). | High | S |
| G3 | No `error.tsx` or branded `not-found.tsx`: the default Next 404 has no way back ([`39-app-not-found-phone.png`](ux-audit/39-app-not-found-phone.png)). | High | S |
| G4 | Header Log out is one tap away, the name is cut off, and the header breaks at 200% text (Top 7). | High | S |
| G5 | Text at 200%: the number plate is cut to one letter on the car page, and sticky footers cover about half the screen ([`40-text-200-*`](ux-audit/)). | High | S |
| G6 | Brand teal `#0f766e` and WhatsApp green `#128c7e` are nearly the same hue, so "primary" and "WhatsApp" look alike on the same screen. | Medium | S |
| G7 | Icons are a mix of emoji (💬 📞 ⬇ 🚗 🏷️ 🔍), text glyphs (← › ✓ ✕) and SVG. Emoji render differently per phone brand and look informal on a report. | Medium | M |
| G8 | Corner radius varies without a rule: 6, 8, 12, 16 and 24 px (`rounded-md` plate, `rounded-lg`, buttons `xl`, cards `2xl`, preview frame `3xl`). | Low | S |
| G9 | Much secondary text is 12–14 px `slate-500` on `slate-50` (4.55:1). It passes AA but washes out in sunlight. Use `slate-600`/`700` for anything people must read. | Medium | S |
| G10 | Disabled buttons use 60% opacity teal (e.g. "Finish inspection", "Confirm reading"), which is hard to tell from enabled in bright light. Use a grey disabled style plus a hint saying why. | Medium | S |
| G11 | Sticky bars use `backdrop-blur`, which is expensive on low-end Android GPUs while scrolling long lists. Use a solid white bar with a top border. | Low | S |
| G12 | No dark mode (`color-scheme: light` only). Also no Hindi (Top 10). | Low / High | M |
| G13 | `aria-progressbar-name`: the progress bars on the Photos and Checklist screens have no accessible name (axe, serious). | Medium | S |
| G14 | The disclaimer appears on almost every app screen (home, car page, login). It's repetitive in the app. Keep it on reports, the landing page and login. | Low | S |
| G15 | Next's route announcer (`role=alert`) plus our own alerts: errors aren't moved into focus. After a failed submit, focus should go to the first error. | Low | S |

### Landing `/` · [`01-landing-full-phone.jpg`](ux-audit/01-landing-full-phone.jpg), [`01-landing-desktop.png`](ux-audit/01-landing-desktop.png)

| # | Issue | Sev | Effort |
|---|---|---|---|
| L1 | Footer shows "[Your registered business name]". Legal pages and contact also show [brackets]. | Critical | S |
| L2 | Copy is for dealers only ("For used-car dealers", "Why dealers use it"), but owners and buyers can sign up. | High | S |
| L3 | No real car photos anywhere: the hero preview uses grey tiles. | High | S |
| L4 | The floating "Chat on WhatsApp" pill covers the hero preview at 360 px and the step cards on desktop. With no number set it links to /contact, which is misleading. | Medium | S |
| L5 | White on WhatsApp green `#128c7e` is 4.14:1 at 16 px regular, which fails AA (axe). Use `#075e54` (7.7:1) or bold 18 px+. | Medium | S |
| L6 | No social proof (number of reports, testimonials, dealer logos) and no FAQ ("Is this a mechanical check?", "How do buyers open it?"). | Medium | M |
| L7 | "About 10 minutes a car" is promised, but the measured flow is about 90–120 taps. Either make the flow faster (Top 3/4) or soften the claim. | Low | S |

### Sample report `/sample-report` · [`02-sample-report-full-phone.jpg`](ux-audit/02-sample-report-full-phone.jpg)

| # | Issue | Sev | Effort |
|---|---|---|---|
| S1 | No photos. The banner says "Real reports also include all 20 photos", which is the exact thing a visitor wants to see. | High | S |
| S2 | It inherits every public-report layout issue (Top 2). | High | M |
| S3 | `/10` at 70% opacity is 3.69:1 (axe). | Low | S |

### Login `/login` · [`06-login-*`](ux-audit/), [`07-otp-*`](ux-audit/)

| # | Issue | Sev | Effort |
|---|---|---|---|
| A1 | Titled "Log in" for brand-new users arriving from "Start free". Say "Log in or sign up". | Medium | S |
| A2 | No header or logo link back to the landing page, so there's no way back except the browser. | Medium | S |
| A3 | No WebOTP auto-read (`navigator.credentials.get({otp})`) on Android. `autocomplete="one-time-code"` only helps on iOS and in some keyboards. | Medium | S |
| A4 | After a wrong OTP the wrong digits stay in the box. Clear and refocus it. | Low | S |
| A5 | "Resend OTP in 26s" is disabled teal at 60% opacity, so it's very faint. | Low | S |
| A6 | Terms and Privacy links are 17 px tall (under 44 px). | Low | S |
| A7 | Good: +91 prefix, numeric keypad, autofocus, clear errors, and a specific offline message. Keep these. | n/a | n/a |

### Onboarding / profile setup `/app/onboarding` · [`12-onboarding-*`](ux-audit/)

| # | Issue | Sev | Effort |
|---|---|---|---|
| O1 | Validation only runs on the server, so "Enter your name" appears after a 1–3 s round trip. Validate required fields in the browser first. | Medium | S |
| O2 | No autofocus on "Your name". | Low | S |
| O3 | The "I am a" choice doesn't explain what changes. Add a one-line hint under each option (e.g. "Dealer: add your shop name and logo to reports"). | Medium | S |
| O4 | "Log out" sits top-right on the very first screen after signing up. | Low | S |
| O5 | The dealer logo is optional, but it's the best branding hook. Show a small preview of how it appears on a report. | Low | M |
| O6 | Address is a free 3-row textarea with no PIN code. Fine for now. | Low | n/a |

### Home / My cars `/app` · [`13-home-empty-phone.png`](ux-audit/13-home-empty-phone.png), [`36-home-with-car-phone.png`](ux-audit/36-home-with-car-phone.png), [`13-home-0-credits-phone.png`](ux-audit/13-home-0-credits-phone.png)

| # | Issue | Sev | Effort |
|---|---|---|---|
| H1 | The big teal credits card is the strongest thing on screen. Credits are also shown in the header badge, so the main job ("add or continue a car") comes second. | High | S |
| H2 | No "continue where you left off": a draft just shows "Draft". Show progress ("Photos 8/20") and a Continue button on the card. | High | S |
| H3 | Car cards have no photo thumbnail, score or date, so dealers with many cars can't scan the list. | Medium | M |
| H4 | "+ Add car" is top-right, out of thumb reach once the list scrolls. Use a sticky bottom button or floating action button. | Medium | S |
| H5 | At 0 credits the card just says "0", with no "Buy credits" button and no explanation that publishing needs one. | Medium | S |
| H6 | Published cars have no quick "Share again" or "Copy link". It takes 3 taps to reach the share button. | Medium | S |
| H7 | No search or filter (by plate, status). Needed past about 20 cars. | Medium | M |
| H8 | Good empty state: clear title, explanation and one primary button. | n/a | n/a |

### Add car `/app/cars/new` · [`14-add-car-*`](ux-audit/), [`15-add-car-found-phone.jpg`](ux-audit/15-add-car-found-phone.jpg)

| # | Issue | Sev | Effort |
|---|---|---|---|
| C1 | After a successful RC lookup, all 8 fields are shown as editable inputs, which makes a 2,100 px page. Show a summary card ("2021 Honda City VX · Petrol · Automatic · 1st owner · insurance to 17 Aug 2027") with "Looks right" and "Edit". | Medium | M |
| C2 | "Enter details myself" is a faint ghost button with the same weight as the hint text. That's fine, but say when to use it ("No RC handy?"). | Low | S |
| C3 | The plate field is good: uppercase, no autocorrect, `enterkeyhint=search`, autofocus, a loading state and a duplicate check. Consider a number-plate styled input (yellow/white plate look) for recognition. | Low | S |
| C4 | Year and Owners use `type=number`, which shows spinners on desktop and allows "e". Use `inputmode=numeric` with a pattern. | Low | S |

### Car page `/app/cars/[id]` · [`16-car-new-phone.jpg`](ux-audit/16-car-new-phone.jpg), [`20-car-photos-done-phone.jpg`](ux-audit/20-car-photos-done-phone.jpg), [`28-car-inspected-full-phone.jpg`](ux-audit/28-car-inspected-full-phone.jpg)

| # | Issue | Sev | Effort |
|---|---|---|---|
| P1 | The main button is below the fold on every visit; the details table comes first (Top 4). | High | S |
| P2 | Score is 10.0/10 before any checking, and the colour doesn't match the report (Top 8). | High | S |
| P3 | No way to edit car details (make, model, year) after saving, though the price estimate error tells users to "Add the make, model and year on the car page". | High | M |
| P4 | No delete or archive for a car (for test cars or mistakes). | Medium | S |
| P5 | The step list is good (numbered, ticks, status lines). Make the whole stepper sticky or show it at the top of each step screen too. | Low | M |

### Photos: guide `/app/cars/[id]/inspect` · [`17-photo-guide-1-phone.png`](ux-audit/17-photo-guide-1-phone.png), [`18-*`](ux-audit/), [`19-*`](ux-audit/)

| # | Issue | Sev | Effort |
|---|---|---|---|
| F1 | Unsent photos are held in memory only, and are lost if the tab is killed while the camera app is open (Top 1). | Critical | L |
| F2 | "Connection is slow. Retrying (1/3)…" is shown while offline. | Medium | S |
| F3 | 4 taps per photo and no auto-advance (Top 3). | High | S |
| F4 | No blur or brightness check before upload, so bad photos cost an AI call and come back "unclear" later. | High | M |
| F5 | The outline and tip aren't visible inside the camera. Next: an in-app camera with an overlay. | Medium | L |
| F6 | In the failed state there are 5 stacked buttons (Try again, Retake, Gallery, Previous, Next) and Next drops below the fold ([`18-photo-upload-failed-offline-phone.png`](ux-audit/18-photo-upload-failed-offline-phone.png)). Merge "Try again" into the status card. | Medium | S |
| F7 | "Choose from gallery" has equal weight to "Take photo". Demote it, and flag gallery photos with an old EXIF date on the report ("uploaded from gallery"). | Medium | M |
| F8 | The disabled "Previous" on photo 1 looks almost enabled; "Skip" is allowed on required photos. | Low | S |
| F9 | The grid's sticky footer (text plus 2 full buttons) covers about 25% of the screen ([`19-photo-grid-required-done-phone.jpg`](ux-audit/19-photo-grid-required-done-phone.jpg)). | Medium | S |
| F10 | When all required photos are done, the main button is "Back to car" instead of "Review damage notes" (Top 4). | High | S |
| F11 | The grid and the damage-notes screen load the **full 1600 px photos** as 80 px thumbnails, though a 640 px copy is already uploaded. With real photos (about 300–450 KB each) that's about 6–9 MB per visit on 4G. Measured with stand-in images: 702 KB of images on the grid. Use the small copies. | High | S |
| F12 | Good: required/optional tags, line drawings per angle, retry with backoff, and a warning before leaving mid-upload. | n/a | n/a |

### Damage notes `/app/cars/[id]/findings` · [`21-*`](ux-audit/), [`22-*`](ux-audit/), [`23-*`](ux-audit/), [`24-*`](ux-audit/)

| # | Issue | Sev | Effort |
|---|---|---|---|
| D1 | The bottom bar says "All notes reviewed." and offers Continue while AI checks are running or have failed (Top 5). | High | S |
| D2 | 20 photo cards, 16 of them "No damage seen", so the page is 5,300 px tall (Top 5). | High | M |
| D3 | "Accept all" is secondary while "Continue" is primary even when notes are unreviewed. Unreviewed notes stay off the report; the user is only warned later, on the report page. | High | S |
| D4 | No marker on the photo showing where the damage is, and the thumbnail is 80 px. Tapping expands it inline but has no zoom. | Medium | M |
| D5 | "Needs review · AI" is 12 px grey on amber. The severity chip and source are small. Make "AI suggestion" a clear label. | Low | S |
| D6 | Delete has a confirmation but no undo. Prefer instant delete plus an "Undo" snackbar (faster, safer). | Low | S |
| D7 | Error copy "Couldn't check this photo" gives no reason or next step besides Try again (e.g. "Too dark? Retake"). | Low | S |
| D8 | Good: an odometer card that reads the photo and asks to confirm, inline edit form, Segmented severity control. | n/a | n/a |

### Checklist `/app/cars/[id]/checklist` · [`25-*`](ux-audit/), [`26-*`](ux-audit/), [`27-*`](ux-audit/)

| # | Issue | Sev | Effort |
|---|---|---|---|
| K1 | Failed saves aren't retried; "All items checked" plus an enabled Finish appear with unsaved items (Top 1). | Critical | M |
| K2 | 19 items at about 200 px each is about 3,800 px of scrolling. Offer a compact mode and "Mark the rest OK" (with a confirmation). | Medium | S |
| K3 | White on `emerald-600` `#009966` is 3.65:1 for the selected "OK" (axe, 17 nodes). Use `#047857` (5.5:1). | Medium | S |
| K4 | "Attention" barely fits its 76 px button at 360 px, and labels will overflow in Hindi. Use icons plus short labels, or a 2×2 grid. | Medium | S |
| K5 | Finishing goes back to the car page, not to the report preview (Top 4). | High | S |
| K6 | Jargon and expert judgement ("suspension noise", "clutch slips"). Add a "How to check" (?) per item (Top 10). | Medium | M |
| K7 | Good: groups, hints, a note box that opens automatically on Attention/Fail, and per-item save state. | n/a | n/a |

### Report preview and publish `/app/cars/[id]/report` · [`29-*`](ux-audit/), [`30-*`](ux-audit/), [`32-*`](ux-audit/), [`33-*`](ux-audit/)

| # | Issue | Sev | Effort |
|---|---|---|---|
| R1 | The Publish button sits mid-page under the price card and five toggles, and above an 8,000 px preview. It isn't sticky, so the user may never find it. Use a sticky bottom bar: "Publish · uses 1 of 3 credits". | High | S |
| R2 | At 0 credits the "Buy credits" block is also mid-page, and the header badge can go stale after a credit change in another tab. | Medium | S |
| R3 | Price estimate: "Searching… up to a minute" shows only a spinner. Show steps or progress ("Found 3 listings…"). After a failure it says only "try again in a minute" ([`30-price-error-phone.png`](ux-audit/30-price-error-phone.png)). | Medium | M |
| R4 | "Search again" looks harmless but uses one of 3 daily searches. Show "2 of 3 left today". | Low | S |
| R5 | The preview header cuts the dealer name off ("Mehta Ca…"), and the number plate box touches the score badge at 360 px. | Medium | S |
| R6 | Good: the switch toggles (`role=switch`), the "This is what buyers will see" framing, and disabled contact buttons in the preview. | n/a | n/a |
| R7 | After publishing: **Share on WhatsApp** is prominent (good), but there's no native share sheet (`navigator.share`) for other apps, and no preview of the WhatsApp card. | Medium | S |

### Public report `/r/[slug]` · [`34-*`](ux-audit/), [`35-photo-viewer-phone.png`](ux-audit/35-photo-viewer-phone.png), [`38-share-preview-og.png`](ux-audit/38-share-preview-og.png), PDF [`41-pdf-page-*`](ux-audit/)

| # | Issue | Sev | Effort |
|---|---|---|---|
| B1 | No hero photo; price and the details table come before photos; the dealer name is cut off (Top 2). | Critical | M |
| B2 | The OG/WhatsApp card has no car photo. | High | S |
| B3 | The sticky contact bar wraps "WhatsApp dealer" onto 2 lines and covers about 120 px of content. The fixed bar is also outside any landmark (axe). | Medium | S |
| B4 | No "how this score works" explanation or link. A buyer can't tell what 6.8 means. | Medium | S |
| B5 | No proof of when the photos were taken (date/time per photo) or that they were taken in-app. This is a key trust signal against reused photos. | Medium | M |
| B6 | The photo viewer has no pinch or double-tap zoom and no damage markers. Swipe and arrow buttons work well. | Medium | M |
| B7 | The disclaimer is clear and not scary: a calm grey box near the end. Also add a small one-line version under the score so nobody misses it. | Low | S |
| B8 | No "Share this report" for buyers (forwarding to family or a mechanic is common). | Low | S |
| B9 | PDF: clean, branded, 4 pages, 230 KB, ready in about 3 s. Good. It also lacks a hero photo on page 1 (photos start halfway down). | Low | S |
| B10 | Report not found is a dead end (no home or sample link). | Low | S |

### Credits `/app/credits` · [`31-credits-0-phone.png`](ux-audit/31-credits-0-phone.png), [`31-credits-after-pay-tap-phone.png`](ux-audit/31-credits-after-pay-tap-phone.png)

| # | Issue | Sev | Effort |
|---|---|---|---|
| $1 | When order creation fails on the server, the message says "Check your internet". Blaming the user's network for a server or Razorpay error sends them on a wild goose chase. Separate network errors from server errors and offer WhatsApp support. | Medium | S |
| $2 | No mention of a 1-report option. For car owners and buyers who need one report, a 10-pack (₹999) is a big ask. Consider a single report (e.g. ₹149) or a 3-pack. | High (business) | S |
| $3 | "You have 0 credits." is plain body text. Make the balance a clear stat and say what it unlocks. | Low | S |
| $4 | Good: per-report price, a "Best value" tag, a secure-payment note, success/slow/failed states and a `?next=` return to the report. | n/a | n/a |

### Profile `/app/profile` · [`09-profile-dealer-phone.jpg`](ux-audit/09-profile-dealer-phone.jpg), [`37-profile-history-phone.jpg`](ux-audit/37-profile-history-phone.jpg)

| # | Issue | Sev | Effort |
|---|---|---|---|
| U1 | This is where Log out, Language and "Delete my account" belong. None are here (DPDP: deletion is only by email). | Medium | S |
| U2 | "Credits" sits in a teal card that looks the same as the home card, so the two screens are easy to confuse. | Low | S |
| U3 | Credit history is clear (+3 sign-up, −1 per report, purchases with payment ID). | n/a | n/a |

### PWA

| # | Issue | Sev | Effort |
|---|---|---|---|
| W1 | The service worker is pass-through: no offline page, no caching of the app shell, no background sync. | High | M |
| W2 | No custom install prompt (`beforeinstallprompt`), so most users will never install. Show "Add Treadmark to home screen" after the first published report. | Medium | S |
| W3 | Manifest is good: name, `standalone`, portrait, teal theme, 192/512 plus maskable icons, `start_url=/app`. The Android splash is generated from these. No iOS splash images and a `default` status bar. | Low | S |
| W4 | No app shortcuts in the manifest ("Add car", "My cars"). | Low | S |

### Performance (local production build, slow 4G, 4× CPU)

| Page | TTFB | First paint | Largest paint | Transfer (JS / images) | CLS |
|---|---|---|---|---|---|
| Landing | 24 ms | 0.70 s | 0.70 s | 181 KB (151 / 0) | 0 |
| Login | 137 ms | 0.62 s | 0.62 s | 278 KB (254 / 0) | 0 |
| Sample report | 12 ms | 0.64 s | 0.64 s | 175 KB (151 / 0) | 0 |
| Public report | 3.4 s | 3.9 s | 3.9 s | 415 KB (148 / 242) | 0 |
| My cars | 3.1 s | 3.5 s | 3.5 s | 157 KB (139 / 0) | 0 |
| Photos grid | 1.4 s | 1.7 s | 3.2 s | 982 KB (258 / **702**) | 0 |
| Report preview | 3.3 s | 3.7 s | 3.7 s | 252 KB (189 / 34) | 0 |

- The server here sits far from Supabase (Seoul), so TTFB is pessimistic. On Vercel `icn1` next to the database, expect roughly 0.5–1.5 s.
- Each app page makes several Supabase calls in sequence. The pages that fetch on the server are where loading skeletons (G2) matter most.
- JS is lean (140–260 KB), and layout shift is zero.
- The one real problem is full-size photos used as thumbnails (F11). With real photos that grid becomes several MB.

---

## 3. Missing features

Compared with Cars24 and Spinny inspection reports, CARS24 and CarDekho dealer tools, and well-designed field-inspection apps.

| Feature | Why | Priority |
|---|---|---|
| **Offline-first drafts with background sync** (outbox, sync banner, "resume" on any device) | Patchy signal at the car; the #1 risk today | **Must-have now** |
| **Resume a half-done inspection from the home screen** ("RJ14CD5678 · Photo 8 of 20 · Continue") | Dealers get interrupted constantly | **Must-have now** |
| **Auto-advance and photo quality check** (blur, dark, too far) with retake guidance | Fewer taps, fewer unclear photos, lower AI cost | **Must-have now** |
| **Hindi toggle** (strings already centralised) | Stated user need | **Must-have now** |
| **Hero-photo report layout plus photo in the WhatsApp card** | Buyer trust | **Must-have now** |
| **Native share sheet** (`navigator.share`) and "Copy report text" | Not everyone shares via WhatsApp Business | **Must-have now** |
| **Loading skeletons, branded error and 404 pages, offline page** | Basic feedback on 4G | **Must-have now** |
| **Edit car details / delete car** | Mistakes happen; the price estimate needs correct data | **Must-have now** |
| **Single-report purchase** (or a 3-pack) for owners and buyers | Owners and buyers rarely need 10 | Next |
| **In-app camera with outline overlay**, level indicator and 1-tap shutter | Halves photo taps and keeps guidance visible | Next |
| **Damage markers on photos** (AI bounding box, editable pin) | Buyers see exactly where the dent is | Next |
| **Report views and buyer interest** ("Viewed 12 times · 3 WhatsApp taps") plus a notification | Dealers love proof the report works | Next |
| **Re-inspection and compare two inspections** (before/after, e.g. after repair or at handover) | Owners and buyers checking delivery condition | Next |
| **Onboarding tips** (3-card "how to shoot good photos", first-run coach marks on the photo screen) | Non-tech users | Next |
| **"Mark the rest OK"** and a compact checklist | Speed for experienced users | Next |
| **Voice notes / speech-to-text for notes** (Hindi and English) | Typing while standing by a car is slow | Next |
| **Search, filter and sort cars; archive sold cars** | Dealers with stock | Next |
| **Install prompt and app shortcuts** | Re-engagement | Next |
| **Photo timestamps and "taken in app" proof on the report** | Anti-fraud and trust | Next |
| **Team accounts** (several inspectors under one dealership) | Bigger dealers | Later |
| **Dark mode** | Night use, battery on OLED | Later |
| **Walkaround video and engine-sound clip** | Common on Spinny/Cars24 listings | Later |
| **Vahan / challan / hypothecation checks** via the RC provider | Buyers ask about loans and fines | Later |
| **OBD-II scan import** | Moves toward mechanical data (keep the disclaimer) | Later |
| **More languages** (Marathi, Tamil, Telugu, Kannada, Bengali) | Regional dealers | Later |
| **Referral credits** ("Give 1, get 1") | Growth | Later |

---

## 4. Proposed design direction

Goals: **readable in direct sun**, **one obvious action per screen within thumb reach**, **looks like a professional certificate on the buyer's side**, works in **Latin and Devanagari** and costs nothing extra on slow 4G.

### Shared rules (apply to either option)

**Typography scale** (16 px base; sizes in px / line height)

| Token | Size | Use |
|---|---|---|
| `caption` | 13 / 18 | Timestamps and legal text only. Never for actions. |
| `small` | 14 / 20 | Secondary text, hints |
| `body` | 16 / 24 | Default text and inputs (16 px stops iOS zoom) |
| `lead` | 18 / 26 | Button labels, list titles |
| `h3` | 20 / 28 | Card titles |
| `h2` | 24 / 32 | Screen titles |
| `h1` | 30 / 36 | Landing and report car title |
| `display` | 48 / 52 | Condition score |

- Weights: 400 body, 600 labels and buttons, 700 titles.
- Number plates use tabular figures with +0.08em letter spacing and must never be truncated.

**Spacing scale** (4 px base): `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`.
- Screen gutter 16; card padding 16; gap between cards 16; gap between sections 24.
- Bottom action bar: 12 px vertical padding plus the safe-area inset, max one primary and one secondary button.

**Radius:** `8` for chips, badges and the number plate · `12` for buttons and inputs · `16` for cards and sheets · `full` for pills and avatars. Nothing else.

**Elevation and shadow:** flat by default, with a 1 px `border` for cards.
- `e1` for sticky bars: top border plus `0 -2px 8px rgb(15 23 42 / 0.06)`.
- `e2` for sheets and dialogs: `0 8px 24px rgb(15 23 42 / 0.16)`.
- No backdrop blur.

**Motion:**
- 120 ms ease-out for presses and toggles; 200 ms ease-out for sheets, expanding cards and page fades; 300 ms max.
- Progress bars animate width. Skeletons use a static pulse, not a shimmer.
- Respect `prefers-reduced-motion` (no movement, only opacity).
- Success moments (photo saved, report published) get a 200 ms check-mark scale-in plus a short vibration on Android.

**Touch:** 48 px minimum for primary and secondary buttons, 44 px absolute minimum. The main action sits in a sticky bottom bar on every task screen.

**Icons:** one SVG line-icon set (e.g. Lucide, about 1 KB per icon, inlined) at a 2 px stroke, 20/24 px. Replace all emoji and text glyphs. The WhatsApp logo is the only brand icon.

**Status colours** (both options; each passes 4.5:1 for text):
- **good / OK:** text `#047857` on tint `#ECFDF5`; solid `#047857` with white text (5.5:1).
- **fair / attention:** text `#92400E` on tint `#FFFBEB`; solid `#B45309` with white text (5.0:1).
- **poor / fail / major:** text `#B91C1C` on tint `#FEF2F2`; solid `#B91C1C` with white text (6.5:1).
- **neutral / N/A:** text `#334155` on tint `#F1F5F9`.
- Always pair colour with a word or icon (✓ ! ✕), never colour alone.

**WhatsApp:** use `#075E54` (7.7:1 with white) for WhatsApp buttons only, never for other actions.

---

### Option A: "Clear Teal" (evolve what's there)

The current teal gets deeper and higher-contrast, and surfaces get cleaner. It's the lowest-risk change and keeps the new Treadmark icon.

| Token | Hex | Notes |
|---|---|---|
| `primary` | `#115E59` | Buttons and links; white on it is 7.6:1 (today `#0F766E` is 5.5:1) |
| `primary-pressed` | `#0B4542` | |
| `primary-tint` | `#E6F4F2` | Selected states, info banners |
| `ink` | `#0B1220` | Main text (18.7:1 on white) |
| `ink-2` | `#334155` | Secondary text (10.4:1). Replaces `slate-500` for readable text. |
| `ink-3` | `#64748B` | Captions only |
| `surface` | `#FFFFFF` | Cards |
| `canvas` | `#F4F6F8` | App background |
| `line` | `#D7DEE6` | Borders (a little darker than today, so cards stay visible in sun) |
| `accent` | `#F59E0B` | Sparingly: "Required" tag, the "Best value" ribbon |

- **Type:** system UI stack for Latin plus **Noto Sans Devanagari** for Hindi. Load it only when Hindi is on, about 40 KB as a subset WOFF2. Zero cost for English users.
- **Feel:** calm, clinical, close to a lab report. Teal stays the brand; WhatsApp gets its own darker green so the two no longer clash.

### Option B: "Road Signal" (bolder, built for outdoors)

Deep navy and number-plate yellow, borrowed from Indian road signs and plates. It's highly legible in sunlight and instantly distinct from WhatsApp green. It's a bigger change: the icon would also move to navy and yellow.

| Token | Hex | Notes |
|---|---|---|
| `primary` | `#0F1B3D` | Buttons, header; white on it is 16.9:1 |
| `primary-pressed` | `#0A1229` | |
| `signal` | `#FFC83D` | Main call-to-action on dark areas, score ring, number-plate fill; navy on it is 10.9:1 |
| `signal-strong` | `#F5A400` | Pressed or selected; navy on it is 8.2:1 |
| `primary-tint` | `#EEF1F8` | Selected states |
| `ink` | `#0B1220` | Main text |
| `ink-2` | `#334155` | Secondary text |
| `surface` | `#FFFFFF` | Cards |
| `canvas` | `#F5F6F8` | App background |
| `line` | `#D5DAE3` | Borders |

- **Type:** **Hind** or **Mukta** (Indian Type Foundry / Ek Type, OFL). One family covers Latin and Devanagari with matching shapes, so Hindi doesn't look like a fallback. 2 weights (500, 700) subset to about 60 KB. Load with `font-display: swap` and keep the system font as the fallback.
- **Feel:**
  - Confident and "official".
  - The public report header becomes a navy band with a yellow number plate and a big score ring, which looks like a certificate.
  - On app screens, keep navy for the header and bottom bar and white for content, so long lists stay light.

### My recommendation

**Option A for the app and Option B's ideas for the buyer-facing report.**
- Concretely: Option A's palette everywhere.
- On the public report, PDF and WhatsApp card, add a yellow number plate and a score ring.
- This keeps the brand you just launched, fixes contrast, and gives buyers a report that looks like a certificate.

If you'd rather have a stronger, more distinctive brand now (before more users see the teal), choose **Option B** across the board.

---

**Waiting for your decision:** pick **A**, **B** or the mix, and tell me which issues to start with. My suggested order is Top 1, 4, 6, 7, 8 (mostly small effort, biggest relief), then 2, 3, 5, 9, 10. No code has been changed in this step.
