# Treadmark

Mobile-first PWA for anyone inspecting a used car in India (car owners, buyers and small used-car dealers): add a car, shoot 20 guided photos, get AI damage notes, fill a checklist and share an inspection report on WhatsApp. Dealers can brand it with their business name and logo.

> Visual and documented inspection. Not a mechanical certification.

See [CLAUDE.md](CLAUDE.md) for the product spec, data model and conventions.

**Status:** Phase 6 (payments, landing page, deploy) done. Phase 6 adds: buying credit packs with Razorpay Checkout, a signed and idempotent Razorpay webhook that is the only thing that adds credits, a profile page with credit history, a public landing page with a sample report, pricing and WhatsApp contact, privacy/terms/refund/contact page templates, basic SEO (titles, Open Graph image, robots.txt, sitemap) and the deploy checklist below. Since Phase 6: signup asks "I am a: Car owner / Buying a car / Dealer"; business name, address and logo are optional and only for dealers, and the `dealers` table is now `profiles`. Phase 1 gave phone OTP login, dealer onboarding with logo, "My cars" home with credits and an installable PWA. Phase 2 added: add a car by number plate with RC lookup (mock provider) or manual entry, car detail page, and status badges. Phase 3 added: guided capture of the 20 photo angles, in-browser compression, upload with retries, a thumbnail grid, retake and resume. Phase 4 adds: Claude vision checks every photo for visible damage (4 at a time), a review screen to accept, edit, delete or add notes, odometer prefill from the odometer photo, the 19-item checklist, a live condition score, and per-car token and cost logging. Phase 5 adds: a report preview where the dealer hides sections, publishing for 1 credit (blocked with a "Buy credits" button at 0), a public report page at `/r/<slug>` with a WhatsApp link preview image, a matching PDF stored in Supabase Storage, and "Share on WhatsApp".

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · Supabase (phone OTP auth, Postgres, Storage, RLS) · Anthropic API (Claude vision) · zod · @react-pdf/renderer · Razorpay (REST API + Checkout, no SDK) · vitest.

> Next.js 16 renamed `middleware.ts` to `proxy.ts`. Ours refreshes the Supabase session and protects `/app/*`.

## Project layout

```
app/                    routes (App Router)
  (site)/               public pages: landing (/), sample-report, privacy, terms, refunds, contact
  robots.ts, sitemap.ts SEO
  login/                phone OTP login
  auth/signout/         POST logout
  app/onboarding/       signup profile: "I am a", name, city; dealers add business name, address, logo
  app/(dashboard)/      /app home and everything behind a completed profile
    cars/new/           add a car: number plate, RC lookup, details form
    cars/[id]/          car detail with "Start / Continue inspection"
    cars/[id]/inspect/  guided photo capture (server page + client PhotoCapture); ?angle=<key> opens one photo
    cars/[id]/findings/ AI damage notes review + odometer confirm
    cars/[id]/checklist/ 19-item checklist, saved on every tap
    cars/[id]/report/   preview, hide sections, publish (1 credit), share link + PDF
    credits/            buy credit packs with Razorpay Checkout (?next= returns to a report)
    profile/            profile details and credit history
  r/[slug]/             public report for buyers (no login)
    og.png/             1200x630 link preview image for WhatsApp
    pdf/                builds the PDF if the report changed, then redirects to a download link
  api/photos/[photoId]/analyse/  POST: analyse one photo with Claude, save notes, log tokens
  api/razorpay/webhook/          POST: Razorpay webhook (signature-checked), adds credits
  manifest.ts           PWA manifest
app/tokens.css          design tokens (colour, type, radius, shadow, motion); see docs/design-system.md
components/ui/          UI kit: Button, Field, Card, Badge, BottomSheet, Toast, StickyBar, StepHeader…
components/             app-specific pieces (angle-hint.tsx: SVG outline per photo angle)
lib/
  strings.ts            every English UI string; strings.hi.ts is the Hindi copy (same shape)
  strings-legal.ts      legal page templates (English only)
  i18n.ts, i18n.server.ts, i18n.actions.ts  language picking (lang cookie, then Accept-Language), getT() on the server
  outbox.ts             on-phone queue (IndexedDB) for photos and checklist answers taken offline
  draft.ts, resume.ts   form drafts kept on the phone, and the last inspection screen for "Pick up where you left off"
  inspection.ts         next step, steps done and provisional score for a car (+ tests)
  images/quality.ts     dark / bright / blurry check before upload (+ tests)
  config.ts             app constants
  env.ts, env.server.ts validated env access
  supabase/             browser, server, proxy and service-role clients + DB types
  validation/           zod schemas (+ tests), incl. Indian number plate rules
  rc/                   RC lookup: one interface, mock + Surepass providers
  cars.ts, format.ts    fuel/transmission keys, date and title formatting
  images/compress.ts    in-browser image compression
  photos/               the 20 angles, progress maths, upload with retry (+ tests)
  ai/                   prompt, JSON schema + zod parsing (analysis.ts), Claude call (claude.ts), prices
  score.ts              condition score (+ tests)
  checklist.ts, findings.ts  checklist items and finding vocabulary
  concurrency.ts        run N tasks at a time (+ tests)
  report/               view.ts (one report model for page, PDF and preview image, + tests), load.ts,
                        pdf.tsx + pdf-store.tsx (render and store PDFs), og-image.tsx, slug.ts, share.ts (wa.me/tel links)
  url.ts                public base URL for shared links
  razorpay/             orders API (api.ts), Checkout loader (checkout.ts), webhook signature + parsing (+ tests)
  credits/              packs and credit history (+ tests)
  site.ts               site URL and WhatsApp contact link
assets/fonts/           Geist (OFL) for the PDF and preview image
proxy.ts                session refresh + /app protection
public/                 icons, service worker
supabase/migrations/    SQL schema, RLS, storage buckets
```

## Setup

### 1. Prerequisites
- Node.js 20.9+ (22 recommended) and npm
- A free [Supabase](https://supabase.com) project

### 2. Install
```bash
npm install
cp .env.example .env.local
```
Fill in `.env.local` from Supabase **Project Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL`: Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `anon` / publishable key
- `SUPABASE_SERVICE_ROLE_KEY`: `service_role` / secret key (server only, never expose)
- `NEXT_PUBLIC_APP_URL`: `http://localhost:3000` for now

- `RC_PROVIDER`: `mock` for realistic fake RC data (no key needed). Leave it empty to always use the manual form.
- `ANTHROPIC_API_KEY`: from console.anthropic.com. `ANTHROPIC_MODEL`: the model that checks photos (see [AI damage notes](#ai-damage-notes)).

The other keys are for later phases and can stay empty for now.

### RC lookup
`lib/rc/index.ts` picks a provider from `RC_PROVIDER`:

| `RC_PROVIDER` | Behaviour |
|---|---|
| `mock` | Fake but realistic details, the same car every time for the same number. Numbers with **ZZ** as the letters (`MH12ZZ1234`, `22BH1234ZZ`) act as "not on record" so you can try the manual form. |
| `surepass` | Calls Surepass RC Full with `RC_API_KEY`. Stub: verify the field mapping in `lib/rc/surepass.ts` against a sandbox response before going live. No key means manual entry. |
| empty / `other` | Lookups off; the dealer types the details in. |

Any lookup failure (timeout, provider error) falls back to the manual form. To add a provider, implement `RcProvider` in `lib/rc/<name>.ts` and add a case in `getRcProvider`.

### AI damage notes
Opening **Damage notes** on a car sends every unchecked photo to `POST /api/photos/<id>/analyse`, 4 at a time (`AI.concurrency` in `lib/config.ts`). The route downloads the photo, makes one Claude call with the rules from CLAUDE.md and a JSON schema, validates the reply with zod (one retry on invalid JSON, then `failed`), drops findings below 0.5 confidence, and saves the raw output in `inspection_photos.ai_findings` and the notes in `findings` (unaccepted) in one transaction. Retaking a photo re-runs it and replaces its AI notes; notes the dealer added are kept. Failed photos only re-run when the dealer taps **Try again**, and each photo is capped at 10 model calls a day.

`ANTHROPIC_MODEL` choices, measured on a 1600 px photo with effort `low` (about 3,650 input tokens per photo):

| Model | Per photo | Per car (20 photos) |
|---|---|---|
| `claude-opus-5-5` | ~$0.015 | ~$0.30 (about ₹25) |
| `claude-sonnet-5-5` | ~$0.008 | ~$0.15 |
| `claude-haiku-5-5` | ~$0.0005 | ~$0.01 |

Damage spotting is where a bigger model earns its cost; try Opus first, then compare Sonnet on the same cars. Effort is set in `AI.effort` (`lib/config.ts`); older models without effort (e.g. Haiku 4.5) need it set to `null`.

**Seeing the cost.** Every model call is logged with its tokens and estimated US$ cost in `ai_usage` (server-only, dealers can't read it), and the server log prints one line per photo, e.g. `[ai] car=… photo=front model=claude-opus-5-5 result=ok calls=1 in=3653 out=210 cost=$0.0188`. In the Supabase SQL editor:
```sql
select reg_number, api_calls, photos, input_tokens, output_tokens, cost_usd, last_call_at
from ai_usage_by_car order by last_call_at desc;
```
Prices live in `lib/ai/pricing.ts`; an unknown model is logged with `cost_usd` empty.

### Condition score
`lib/score.ts`, exactly as in CLAUDE.md: start at 10, minus 0.3 / 0.8 / 1.5 per accepted minor / moderate / major note, minus 0.3 per checklist "Attention" and 1.0 per "Fail", clamped to 1.0-10.0 and rounded to one decimal. Unaccepted notes don't count. It's calculated in tenths so there's no floating point drift. The car page shows it live; **Finish inspection** on the checklist (all 19 answered) marks the car Inspected.

### Reports
**Preview and publish** (`/app/cars/<id>/report`, opened from the car page once the checklist is finished). The dealer sees exactly what buyers will see and can switch off Photos, Damage notes, Checklist or Documents. Only accepted damage notes appear; the score always counts everything. **Publish report** costs 1 credit: the server works out the score from the dealer's own rows, then `publish_report` (a database function only the service role can run) takes the credit, creates the report with a random 10-character slug and marks the car Published in one transaction. Two cars racing for the last credit, or a double tap, can't spend more than one. Publishing again is free and keeps the same link. With 0 credits the button becomes **Buy credits** (packs from `CREDIT_PACKS` in `lib/config.ts`).

**Live report.** `/r/<slug>` reads the car's current notes, checklist and photos, so fixes after publishing show straight away without another credit. Hidden sections are removed on the server and never sent to the buyer's browser. The page is `noindex`.

**Photos.** Each new photo also uploads a 640 px copy to `cars/<id>/small/` (about 60 KB) for the gallery and PDF; tapping opens the full photo. Photos taken before Phase 5 have no small copy, so the report uses the full one.

**PDF.** Stored privately in the `reports` bucket at `<car_id>/<content hash>.pdf`. It's built in the background right after publishing, and `/r/<slug>/pdf` rebuilds it only when something on the report changed, then redirects to a 5-minute download link. Bump `REPORT.pdfVersion` after changing the layout.

**Share links** use `NEXT_PUBLIC_APP_URL`, or the address the page was opened on when that's empty. Set it to your real public URL (e.g. `https://treadmark.vercel.app`) in Vercel, otherwise shared links point wherever the dealer happened to open the app.

### Price estimate
On the report screen, **Estimate market price** asks Claude (`ANTHROPIC_MODEL`) to research current Indian used-car listings with live web search (`web_search_20260209`, up to 5 searches) for the same make, model, variant, fuel and year, near the user's city. Claude finishes by calling a strict `submit_price_estimate` tool with a range for the car **in average condition**, a short summary and the listings it used. The server keeps only listing links that actually appeared in the search results, then stores the range in `price_estimates` (only the service role writes it).

When the report is shown, `lib/price/estimate.ts` adjusts that range for the car's live condition score: about 2% per point above or below 7.5, capped at +5% / -15%, rounded to ₹5,000 or ₹10,000. Because the adjustment uses the current score, editing notes or the checklist later moves the range without a new search. "Price estimate" is a report section like Photos: shown by default once an estimate exists, and the owner can switch it off.

**Cost and limits.** One estimate takes 20-60 seconds and costs about US$0.25 (≈₹20) on `claude-opus-5-5`: roughly 40,000 input tokens of search results plus $0.01 per search. It's free for users, capped at 3 per car per day (`PRICE` in `lib/config.ts`). Each call is logged in `ai_usage` with `purpose = 'price_estimate'` and its search count:
```sql
select car_id, count(*) filter (where attempt = 1) as estimates, sum(web_search_requests) as searches, round(sum(cost_usd), 3) as usd
from ai_usage where purpose = 'price_estimate' group by car_id;
```

### Checking the WhatsApp link preview
WhatsApp only previews public **HTTPS** links, so `localhost` and LAN IPs won't work.
1. Get a public URL: deploy to Vercel (preview deployments are fine), or run `npm run build && npm start` and expose it with a tunnel such as `npx cloudflared tunnel --url http://localhost:3000`. Set `NEXT_PUBLIC_APP_URL` to that URL and restart (or leave it empty so links follow the address you open).
2. Publish a report and tap **Copy link**.
3. Check the tags first: open `https://<your-url>/r/<slug>/og.png` (a 1200x630 card with the score), then paste the report link into [opengraph.xyz](https://www.opengraph.xyz) or the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) (WhatsApp uses the same Open Graph tags). You should see the title "<car> · Condition 8.4/10", the description and the card.
4. Paste the link into any WhatsApp chat (e.g. "Message yourself") and wait for the preview to appear before sending.
5. WhatsApp caches previews per link for a long time. If you fixed something, you won't see it on a link already shared: test with another report, or add `?v=2` to the link.

### Payments (Razorpay)
Packs and prices are `CREDIT_PACKS` in `lib/config.ts` (prices in paise). On **Buy credits** the server creates a Razorpay order and a `payments` row (`created`), and the browser opens Razorpay Checkout (loaded only when the dealer taps Pay). Checkout's own "success" proves nothing, so the page then waits for our database to say the order is paid, which only the webhook can do:

1. Razorpay calls `POST /api/razorpay/webhook`. The route checks `X-Razorpay-Signature` (HMAC-SHA256 of the raw body with `RAZORPAY_WEBHOOK_SECRET`); anything else gets 400.
2. `order.paid` / `payment.captured` call `apply_razorpay_payment`, a database function only the service role can run. It locks the order row, checks the amount, marks it paid and adds the credits in one transaction. The same payment arriving again (Razorpay retries, and sends both events) returns `duplicate` and changes nothing.
3. `payment.failed` marks an open order failed; a later successful retry on the same order still credits.

If the webhook is slow, the dealer sees "Payment received, credits in a minute or two" with a **Check again** button. Credit history on **Profile** is built from the signup bonus, paid orders and published reports.

**Testing payments locally.** Razorpay can't reach `localhost`, so locally Checkout works but credits only arrive if you expose the app (e.g. `npx cloudflared tunnel --url http://localhost:3000`) and point a **test mode** webhook at `https://<tunnel>/api/razorpay/webhook`. In test mode pay with UPI ID `success@razorpay` (or `failure@razorpay`), or the test cards in Razorpay's docs.

### Business details and legal pages
`BUSINESS` in `lib/config.ts` fills the contact page, footer and legal templates. Replace every `[bracket]` and set `whatsapp` (digits with country code) so the "Chat on WhatsApp" buttons open a chat; until then they open `/contact`. The texts are in `lib/strings.ts` under `legal`: they are starting templates, have them reviewed before relying on them. `SAMPLE_REPORT_PATH` can point at one of your real published reports instead of the made-up sample.

### 3. Create the database
Pick one:
- **Dashboard:** open **SQL Editor** and run each file in `supabase/migrations/` in name order.
- **CLI:** `npx supabase login`, `npx supabase link --project-ref <your-ref>`, then `npx supabase db push`.

This creates all tables with Row Level Security, a trigger that gives each new user 3 free credits, and two storage buckets: `logos` (public) and `inspection-photos` (private). If you set the database up before Phase 3, run `20261019000200_photo_paths.sql` too: photo uploads fail without it. For Phase 4 run `20261019000300_ai_analysis.sql`: it adds the `ai_usage` table, the `save_photo_analysis` function and a version stamp on photos. For Phase 5 run `20261019000400_reports.sql`: it adds the `reports` bucket, the `publish_report` function and checks on report slugs and hidden sections. For Phase 6 run `20261019000500_payments.sql`: it adds `apply_razorpay_payment` and a few columns on `payments`. Then run `20261019000600_profiles.sql`: it renames `dealers` to `profiles`, adds `user_type` (existing users who finished signup become `dealer`) and updates the functions that used the old table. Deploy the app code together with this migration: the old code reads `dealers` and the new code reads `profiles`. Finally, for the price estimate, run `20261020000700_price_estimates.sql`.

### 4. Turn on phone login
In Supabase go to **Authentication → Sign In / Providers → Phone** and enable it.

- **For development (free, no SMS):** under *Test Phone Numbers and OTPs* add e.g. `919999999999=123456`. Logging in with `99999 99999` then accepts `123456` and no SMS is sent. If the dashboard requires SMS provider fields before it will save, pick Twilio and enter placeholder values; test numbers never hit the provider.
- **For real SMS:** configure Twilio, Twilio Verify, MessageBird, Vonage or Textlocal. SMS to Indian numbers needs a DLT-registered sender and template with your provider.
- **Auto-fill the code on Android:** the login screen reads the code from the SMS (WebOTP) when the message's last line is `@your-domain.com #123456`. In **Authentication → SMS template** end the message with `@<your domain> #{{ .Code }}` (for example `Your Treadmark code is {{ .Code }}` on one line, then `@treadmark.in #{{ .Code }}`), and register that template with your DLT provider. Without it, people type the code as before.

### 5. Run
```bash
npm run dev
```
Open http://localhost:3000, tap **Log in with phone**, enter the test number and OTP, pick who you are, fill in your name and city (dealers can add a business name, address and logo), and you'll land on **My cars**.

## Languages

The app, login and public report come in English and Hindi. People switch with the **English / हिन्दी** toggle on the login and profile screens; the choice is saved in a `lang` cookie, and first-time visitors get the language their phone asks for. The landing, legal pages, PDF and WhatsApp preview image stay English.

- Server components: `const t = await getT()` from `lib/i18n.server.ts`. Client components: `const t = useT()` from `components/i18n-provider.tsx`.
- Validation schemas return string keys (like `"cars.errors.make"`); show them with `errorText(t, key)`.
- **To add a language:** copy `lib/strings.hi.ts` to `lib/strings.<code>.ts`, translate it (TypeScript fails the build if a key is missing or a function has the wrong arguments), then add the code to `LOCALES` and `dictionary()` in `lib/i18n.ts` and a name in `common.languageNames`.

## Working offline

Photos and checklist answers are written to an on-phone queue (`lib/outbox.ts`, IndexedDB) before they are uploaded. If the signal drops, they stay on the phone, show as "waiting", and upload by themselves when the connection is back, even after the page is reloaded. The service worker (`public/sw.js`, production builds only) shows `public/offline.html` when a page can't load.

## Test on your phone (same Wi-Fi)

1. Start the dev server on all interfaces:
   ```bash
   npm run dev:lan
   ```
2. Find your computer's local IP:
   - macOS: `ipconfig getifaddr en0`
   - Windows: `ipconfig` → "IPv4 Address" of your Wi-Fi adapter
   - Linux: `hostname -I`
3. On the phone (same Wi-Fi network), open `http://<that-ip>:3000/login`, e.g. `http://192.168.1.23:3000/login`.
4. Log in with your test number and OTP.

`next.config.ts` already allows `192.168.*.*` and `10.*.*.*`. If your network uses another range (e.g. `172.20.x.x`), set `DEV_LAN_ORIGIN=172.20.1.5` in `.env.local` and restart. If the phone can't connect at all, allow Node through your computer's firewall on port 3000.

### Installing as an app (Android)
Chrome only offers **Install app** on HTTPS (or `localhost`), and the service worker is registered in production builds only. Options:
- Deploy to Vercel (any preview URL works) and open it in Chrome → menu → **Install app**.
- Or locally: `npm run build && npx next start -H 0.0.0.0`, then on the phone open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, add `http://<your-ip>:3000`, relaunch Chrome, and install.

## Deploy to Vercel

### 1. Before you deploy
- [ ] Fill in `BUSINESS` in `lib/config.ts` (legal name, address, email, WhatsApp number, grievance officer) and read through the legal texts in `lib/strings.ts`. Commit and push.
- [ ] Database: every file in `supabase/migrations/` is applied to your Supabase project (SQL editor, in name order, or `npx supabase db push`).
- [ ] Merge your work into the branch Vercel will deploy (`master`).

### 2. Create the Vercel project
1. Sign in at [vercel.com](https://vercel.com) with GitHub and choose **Add New → Project**, then import this repository.
2. Framework preset: **Next.js** (detected). Leave the build and output settings as they are. Pick a region near India, e.g. **Mumbai (bom1)**, under **Settings → Functions** after the first deploy.
3. Before clicking **Deploy**, open **Environment Variables** and add these for **Production** (and **Preview** if you want preview deploys to work):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase **Project Settings → API** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `ANTHROPIC_MODEL` | e.g. `claude-opus-5-5` (see [AI damage notes](#ai-damage-notes)) |
| `RAZORPAY_KEY_ID` | Razorpay **Account & Settings → API keys** (`rzp_test_…` first, `rzp_live_…` later) |
| `RAZORPAY_KEY_SECRET` | from the same screen |
| `RAZORPAY_WEBHOOK_SECRET` | the secret you type when creating the webhook (step 4) |
| `RC_PROVIDER` | `mock` until you have an RC provider, then e.g. `surepass` |
| `RC_API_KEY` | your RC provider key (any placeholder while `mock`) |
| `NEXT_PUBLIC_APP_URL` | your public URL, e.g. `https://treadmark.in` (no trailing slash) |

Leave `RAZORPAY_API_URL` and `DEV_LAN_ORIGIN` unset. `NEXT_PUBLIC_*` values are baked in at build time: after changing one, **redeploy**.

4. Click **Deploy** and open the `*.vercel.app` URL. Log in with your test number, check the landing page, sample report and `/robots.txt`.

### 3. Connect your domain
1. Vercel project → **Settings → Domains → Add**, enter `treadmark.in` (and `www.treadmark.in`; let Vercel redirect one to the other).
2. At your domain registrar add the DNS records Vercel shows (usually an `A` record for the root to `76.76.21.21` and a `CNAME` for `www` to `cname.vercel-dns.com`). HTTPS is issued automatically once DNS resolves (minutes to a few hours).
3. Set `NEXT_PUBLIC_APP_URL` to `https://<your-domain>` in Vercel and **redeploy**, so shared report links, the sitemap and link previews use your domain.
4. Supabase → **Authentication → URL Configuration**: set **Site URL** to the same address.

### 4. Point the Razorpay webhook at production
1. Razorpay Dashboard → **Account & Settings → Webhooks → Add New Webhook** (do it in **Test mode** first, then again in **Live mode**: each mode has its own webhooks).
2. Webhook URL: `https://<your-domain>/api/razorpay/webhook`
3. Secret: a long random string (e.g. `openssl rand -hex 32`). Put the same value in Vercel as `RAZORPAY_WEBHOOK_SECRET` and redeploy.
4. Active events: **order.paid**, **payment.captured**, **payment.failed**. Save.
5. Test: buy the 10-report pack on the live site in test mode with UPI `success@razorpay`. Credits should appear within seconds; Vercel **Logs** show a `[razorpay] … -> credited` line. Razorpay's webhook page shows each delivery and its response.

### 5. Going live
- [ ] Complete Razorpay KYC and activation. Razorpay reviews your website: the contact, terms, privacy and refund pages must show your real details. Add your domain under **Account & Settings → Website and app details**.
- [ ] Generate **live** API keys, put them in Vercel (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`), create the live webhook (step 4) and update `RAZORPAY_WEBHOOK_SECRET`. Redeploy.
- [ ] Real SMS: configure an SMS provider with a DLT-registered sender and template in Supabase (**Authentication → Sign In / Providers → Phone**), and remove or limit the test phone numbers.
- [ ] Make one real ₹999 purchase, check the credits and the history, then refund it from the Razorpay dashboard if you like.
- [ ] Rotate any keys that were ever pasted into chats or tickets.

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` / `dev:lan` | Dev server (localhost / whole LAN) |
| `npm run build` / `start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types + `tsc --noEmit` |
| `npm test` | Unit tests (vitest) |

## Security notes
- RLS is on for every table: a user only sees their own rows. Users can't change their own `credits`, insert payments or publish reports; column grants block it at the database level.
- The service-role key is only used in server code (`lib/supabase/admin.ts`).
- Logos (dealers only) are uploaded straight from the browser into the user's own folder (`logos/<dealer_id>/…`), which storage policies enforce.
- Inspection photos are uploaded from the browser to the private `inspection-photos` bucket at `cars/<car_id>/<angle_key>.jpg`. The storage policy allows a path only when the car in it belongs to the signed-in dealer. Thumbnails use signed URLs that expire after 2 hours.
- Claude is only called from the server (`app/api/photos/[photoId]/analyse`). The route reads the photo as the signed-in dealer, so RLS stops anyone analysing another dealer's photo. `ai_usage` and `ai_usage_by_car` have no dealer access at all; only the service role writes and reads them.
- Publishing goes through `publish_report`, which only the service role can execute, so a dealer can't publish without spending a credit or with a made-up score. Dealers can change only `hidden_sections` on their own reports.
- Credits are added only by the Razorpay webhook after the signature check, through `apply_razorpay_payment` (service role only), which locks the order, checks the amount and is idempotent on the payment. The browser can't add credits: Checkout's success callback only starts polling the order's status. Orders are created on the server with the secret key; only the public key id reaches the browser.
- Public reports and their PDFs are read with the service role by slug, and only when `published_at` is set. Slugs are 10 random characters (about 10^15 possibilities). Photo links on the page expire after 24 hours and PDF download links after 5 minutes.
