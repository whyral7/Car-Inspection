# CarParakh

Mobile-first PWA for small Indian used-car dealers: add a car, shoot 20 guided photos, get AI damage notes, fill a checklist and share a branded inspection report on WhatsApp.

> Visual and documented inspection. Not a mechanical certification.

See [CLAUDE.md](CLAUDE.md) for the product spec, data model and conventions.

**Status:** Phase 4 (AI damage notes, checklist and score) done. Phase 1 gave phone OTP login, dealer onboarding with logo, "My cars" home with credits and an installable PWA. Phase 2 added: add a car by number plate with RC lookup (mock provider) or manual entry, car detail page, and status badges. Phase 3 added: guided capture of the 20 photo angles, in-browser compression, upload with retries, a thumbnail grid, retake and resume. Phase 4 adds: Claude vision checks every photo for visible damage (4 at a time), a review screen to accept, edit, delete or add notes, odometer prefill from the odometer photo, the 19-item checklist, a live condition score, and per-car token and cost logging.

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · Supabase (phone OTP auth, Postgres, Storage, RLS) · Anthropic API (Claude vision) · zod · vitest. Later phases add @react-pdf/renderer and Razorpay.

> Next.js 16 renamed `middleware.ts` to `proxy.ts`. Ours refreshes the Supabase session and protects `/app/*`.

## Project layout

```
app/                    routes (App Router)
  login/                phone OTP login
  auth/signout/         POST logout
  app/onboarding/       dealer profile + logo
  app/(dashboard)/      /app home and everything behind a completed profile
    cars/new/           add a car: number plate, RC lookup, details form
    cars/[id]/          car detail with "Start / Continue inspection"
    cars/[id]/inspect/  guided photo capture (server page + client PhotoCapture); ?angle=<key> opens one photo
    cars/[id]/findings/ AI damage notes review + odometer confirm
    cars/[id]/checklist/ 19-item checklist, saved on every tap
  api/photos/[photoId]/analyse/  POST: analyse one photo with Claude, save notes, log tokens
  manifest.ts           PWA manifest
components/             shared UI (angle-hint.tsx: SVG outline per photo angle)
lib/
  strings.ts            every UI string (add Hindi here later)
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

### 3. Create the database
Pick one:
- **Dashboard:** open **SQL Editor** and run each file in `supabase/migrations/` in name order.
- **CLI:** `npx supabase login`, `npx supabase link --project-ref <your-ref>`, then `npx supabase db push`.

This creates all tables with Row Level Security, a trigger that gives each new dealer 3 free credits, and two storage buckets: `logos` (public) and `inspection-photos` (private). If you set the database up before Phase 3, run `20261019000200_photo_paths.sql` too: photo uploads fail without it. For Phase 4 run `20261019000300_ai_analysis.sql`: it adds the `ai_usage` table, the `save_photo_analysis` function and a version stamp on photos.

### 4. Turn on phone login
In Supabase go to **Authentication → Sign In / Providers → Phone** and enable it.

- **For development (free, no SMS):** under *Test Phone Numbers and OTPs* add e.g. `919999999999=123456`. Logging in with `99999 99999` then accepts `123456` and no SMS is sent. If the dashboard requires SMS provider fields before it will save, pick Twilio and enter placeholder values; test numbers never hit the provider.
- **For real SMS:** configure Twilio, Twilio Verify, MessageBird, Vonage or Textlocal. SMS to Indian numbers needs a DLT-registered sender and template with your provider.

### 5. Run
```bash
npm run dev
```
Open http://localhost:3000, tap **Log in with phone**, enter the test number and OTP, fill in the dealership form, and you'll land on **My cars**.

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

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` / `dev:lan` | Dev server (localhost / whole LAN) |
| `npm run build` / `start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types + `tsc --noEmit` |
| `npm test` | Unit tests (vitest) |

## Security notes
- RLS is on for every table: a dealer only sees their own rows. Dealers can't change their own `credits`, insert payments or publish reports; column grants block it at the database level.
- The service-role key is only used in server code (`lib/supabase/admin.ts`).
- Logos are uploaded straight from the browser into the dealer's own folder (`logos/<dealer_id>/…`), which storage policies enforce.
- Inspection photos are uploaded from the browser to the private `inspection-photos` bucket at `cars/<car_id>/<angle_key>.jpg`. The storage policy allows a path only when the car in it belongs to the signed-in dealer. Thumbnails use signed URLs that expire after 2 hours.
- Claude is only called from the server (`app/api/photos/[photoId]/analyse`). The route reads the photo as the signed-in dealer, so RLS stops anyone analysing another dealer's photo. `ai_usage` and `ai_usage_by_car` have no dealer access at all; only the service role writes and reads them.
