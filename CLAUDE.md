# CarParakh: project guide

## Product
A mobile-first PWA for anyone inspecting a used car in India: car owners, people buying a car, and small used-car dealers. At signup the user picks "I am a: Car owner / Buying a car / Dealer". A user adds a car by registration number, shoots a guided set of 20 photos, gets AI damage notes, fills a short checklist, and shares an inspection report (PDF + public link) on WhatsApp. Dealers can brand reports with an optional business name, address and logo (shown only for dealers). Users buy prepaid report credits.

Every report must state: "Visual and documented inspection. Not a mechanical certification."

## Stack (do not add other major dependencies without asking)
- Next.js (App Router) + TypeScript (strict) + Tailwind CSS
- Supabase: phone OTP auth, Postgres, Storage, Row Level Security
- Anthropic API (Claude vision) for photo analysis, server-side only
- @react-pdf/renderer for the PDF
- Razorpay (orders + webhook) for credits
- zod for all input validation
- Deployed on Vercel

## Environment variables (.env.local, never commit)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, ANTHROPIC_MODEL, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, RC_PROVIDER (mock | surepass | other), RC_API_KEY, NEXT_PUBLIC_APP_URL
Keep a .env.example with every key and no values.

## Data model (Supabase migrations in supabase/migrations)
- profiles: id (= auth.users.id), user_type (car_owner | buyer | dealer; null until chosen at signup), owner_name, business_name, phone, city, address, logo_path, credits int default 3, created_at. business_name, address and logo_path are optional and dealer-only.
- cars: id, dealer_id (references profiles; name kept from when only dealers signed up), reg_number, make, model, variant, fuel, transmission, year, owners, insurance_valid_upto, rc_raw jsonb, odometer_km, status (draft | inspected | published), created_at
- inspection_photos: id, car_id, angle_key, storage_path, ai_status (pending | done | failed | unclear), ai_findings jsonb, created_at
- findings: id, car_id, photo_id nullable, type (dent | scratch | rust | repaint | crack | tyre_wear | other), location, severity (minor | moderate | major), note, source (ai | dealer, where dealer means added by the user), accepted bool
- checklist_items: id, car_id, item_key, result (ok | attention | fail | na), note
- reports: id, car_id, slug unique, score numeric, hidden_sections text[], pdf_path, published_at
- payments: id, dealer_id, razorpay_order_id, razorpay_payment_id, amount_paise, credits, status (created | paid | failed), created_at
RLS on every table: a user reads and writes only their own rows. Public report pages are served by a server route that looks up by slug with the service role and only returns published reports.

## Photo angles (fixed order, angle_key in brackets)
1 Front [front] 2 Front-left 45 degrees [front_left] 3 Left side [left] 4 Rear-left 45 degrees [rear_left] 5 Rear [rear] 6 Rear-right 45 degrees [rear_right] 7 Right side [right] 8 Front-right 45 degrees [front_right] 9 Engine bay [engine] 10 Chassis number plate [chassis] 11 Odometer [odometer] 12 Dashboard with engine on, warning lights [dashboard] 13 Front seats [front_seats] 14 Rear seats [rear_seats] 15 Boot [boot] 16 Spare tyre [spare] 17 Front-left tyre tread [tyre_fl] 18 Front-right tyre tread [tyre_fr] 19 Rear-left tyre tread [tyre_rl] 20 Rear-right tyre tread [tyre_rr]

## Checklist items (item_key)
engine_start, engine_noise, exhaust_smoke, ac_cooling, power_windows, brakes, clutch_gearbox, steering, suspension_noise, lights, horn, battery, rc_original, insurance_valid, puc_valid, service_history, flood_signs, accident_signs, spare_key

## AI photo analysis rules
- One API call per photo, server-side, model from ANTHROPIC_MODEL.
- System prompt: you are a used-car inspector; report only damage you can clearly see; never guess hidden or mechanical faults.
- Return strict JSON only: {"unclear": boolean, "findings": [{"type", "location", "severity", "confidence" (0-1), "note"}]}. Validate with zod; on invalid JSON retry once, then mark failed.
- Drop findings with confidence below 0.5. The user can accept, edit or delete every finding.
- For odometer photos, also return {"odometer_km": number | null}.

## Condition score (deterministic, unit-tested)
Start at 10. Subtract 0.3 per accepted minor finding, 0.8 per moderate, 1.5 per major; 0.3 per checklist "attention", 1.0 per "fail". Clamp to 1.0-10.0, round to one decimal.

## Credits
Every new user gets 3 free credits. Publishing a report costs 1 credit, deducted in a database transaction. Packs: 10 reports for Rs 999, 30 for Rs 2,499 (prices in one config file). Credits are added only from a verified Razorpay webhook, never from the client.

## Conventions
- Mobile-first: design for 360px width first, big tap targets, works on slow 4G.
- Compress images in the browser to max 1600px long edge, JPEG quality 0.8, before upload.
- All secrets and AI/RC/Razorpay calls stay on the server (route handlers or server actions).
- RC lookup goes through one interface in lib/rc/ with a mock provider; real providers plug in by env var.
- Plain, friendly English in the UI; keep strings in one file so Hindi can be added later.
- After each phase: run lint, typecheck and tests, fix failures, then summarise what changed and how to test it on a phone.
- Small, focused commits with clear messages.

## Phases
1 Foundation, 2 Add a car, 3 Photo checklist, 4 AI damage notes + checklist + score, 5 Report PDF + public link + share, 6 Payments + landing page + deploy. Work on one phase at a time; never start the next phase unless I ask.
