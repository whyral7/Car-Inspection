# CarParakh

Mobile-first PWA for small Indian used-car dealers: add a car, shoot 20 guided photos, get AI damage notes, fill a checklist and share a branded inspection report on WhatsApp.

> Visual and documented inspection. Not a mechanical certification.

See [CLAUDE.md](CLAUDE.md) for the product spec, data model and conventions.

**Status:** Phase 3 (Photo checklist) done. Phase 1 gave phone OTP login, dealer onboarding with logo, "My cars" home with credits and an installable PWA. Phase 2 added: add a car by number plate with RC lookup (mock provider) or manual entry, car detail page, and status badges. Phase 3 adds: guided capture of the 20 photo angles (outline hint + tip for each), in-browser compression, upload with retries, a thumbnail grid with progress, retake and resume.

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · Supabase (phone OTP auth, Postgres, Storage, RLS) · zod · vitest. Later phases add the Anthropic API, @react-pdf/renderer and Razorpay.

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
    cars/[id]/inspect/  guided photo capture (server page + client PhotoCapture)
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

The other keys are for later phases and can stay empty for now.

### RC lookup
`lib/rc/index.ts` picks a provider from `RC_PROVIDER`:

| `RC_PROVIDER` | Behaviour |
|---|---|
| `mock` | Fake but realistic details, the same car every time for the same number. Numbers with **ZZ** as the letters (`MH12ZZ1234`, `22BH1234ZZ`) act as "not on record" so you can try the manual form. |
| `surepass` | Calls Surepass RC Full with `RC_API_KEY`. Stub: verify the field mapping in `lib/rc/surepass.ts` against a sandbox response before going live. No key means manual entry. |
| empty / `other` | Lookups off; the dealer types the details in. |

Any lookup failure (timeout, provider error) falls back to the manual form. To add a provider, implement `RcProvider` in `lib/rc/<name>.ts` and add a case in `getRcProvider`.

### 3. Create the database
Pick one:
- **Dashboard:** open **SQL Editor** and run each file in `supabase/migrations/` in name order.
- **CLI:** `npx supabase login`, `npx supabase link --project-ref <your-ref>`, then `npx supabase db push`.

This creates all tables with Row Level Security, a trigger that gives each new dealer 3 free credits, and two storage buckets: `logos` (public) and `inspection-photos` (private). If you set the database up before Phase 3, run `20261019000200_photo_paths.sql` too: photo uploads fail without it.

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
