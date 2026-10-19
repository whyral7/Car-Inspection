-- ===== dealers =====
create table public.dealers (
  id uuid primary key references auth.users(id) on delete cascade,
  owner_name text,
  business_name text,
  phone text,
  city text,
  address text,
  logo_path text,
  credits int not null default 3 check (credits >= 0),
  created_at timestamptz not null default now()
);

-- Auto-create a dealer row (with 3 free credits) when a user signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.dealers (id, phone) values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== cars =====
create table public.cars (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null default auth.uid() references public.dealers(id) on delete cascade,
  reg_number text not null,
  make text, model text, variant text,
  fuel text, transmission text,
  year int check (year between 1980 and 2100),
  owners int check (owners >= 0),
  insurance_valid_upto date,
  rc_raw jsonb,
  odometer_km int check (odometer_km >= 0),
  status text not null default 'draft' check (status in ('draft','inspected','published')),
  created_at timestamptz not null default now()
);
create index cars_dealer_id_created_at_idx on public.cars (dealer_id, created_at desc);
create index cars_reg_number_idx on public.cars (dealer_id, reg_number);

-- ===== inspection_photos =====
create table public.inspection_photos (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  angle_key text not null check (angle_key in (
    'front','front_left','left','rear_left','rear','rear_right','right','front_right',
    'engine','chassis','odometer','dashboard','front_seats','rear_seats','boot','spare',
    'tyre_fl','tyre_fr','tyre_rl','tyre_rr')),
  storage_path text not null,
  ai_status text not null default 'pending' check (ai_status in ('pending','done','failed','unclear')),
  ai_findings jsonb,
  created_at timestamptz not null default now(),
  unique (car_id, angle_key)
);

-- ===== findings =====
create table public.findings (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  photo_id uuid references public.inspection_photos(id) on delete set null,
  type text not null check (type in ('dent','scratch','rust','repaint','crack','tyre_wear','other')),
  location text,
  severity text not null check (severity in ('minor','moderate','major')),
  note text,
  source text not null check (source in ('ai','dealer')),
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);
create index findings_car_id_idx on public.findings (car_id);
create index findings_photo_id_idx on public.findings (photo_id);

-- ===== checklist_items =====
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  item_key text not null check (item_key in (
    'engine_start','engine_noise','exhaust_smoke','ac_cooling','power_windows','brakes',
    'clutch_gearbox','steering','suspension_noise','lights','horn','battery','rc_original',
    'insurance_valid','puc_valid','service_history','flood_signs','accident_signs','spare_key')),
  result text not null check (result in ('ok','attention','fail','na')),
  note text,
  unique (car_id, item_key)
);

-- ===== reports =====
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null unique references public.cars(id) on delete cascade,
  slug text not null unique,
  score numeric(3,1) check (score between 1.0 and 10.0),
  hidden_sections text[] not null default '{}',
  pdf_path text,
  published_at timestamptz
);

-- ===== payments =====
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  amount_paise int not null check (amount_paise > 0),
  credits int not null check (credits > 0),
  status text not null default 'created' check (status in ('created','paid','failed')),
  created_at timestamptz not null default now()
);
create index payments_dealer_id_idx on public.payments (dealer_id);

-- ===== Row Level Security =====
alter table public.dealers           enable row level security;
alter table public.cars              enable row level security;
alter table public.inspection_photos enable row level security;
alter table public.findings          enable row level security;
alter table public.checklist_items   enable row level security;
alter table public.reports           enable row level security;
alter table public.payments          enable row level security;

-- Helper: does the current user own this car?
create function public.owns_car(p_car_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cars c
                 where c.id = p_car_id and c.dealer_id = (select auth.uid()));
$$;

-- dealers: read own row; update only profile columns (never credits/phone/id).
create policy dealers_select_own on public.dealers for select to authenticated
  using (id = (select auth.uid()));
create policy dealers_update_own on public.dealers for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke insert, update, delete on public.dealers from anon, authenticated;
grant update (owner_name, business_name, city, address, logo_path) on public.dealers to authenticated;

-- cars: full CRUD on own rows.
create policy cars_all_own on public.cars for all to authenticated
  using (dealer_id = (select auth.uid())) with check (dealer_id = (select auth.uid()));

-- child tables: full CRUD when the parent car is owned.
create policy photos_all_own on public.inspection_photos for all to authenticated
  using (public.owns_car(car_id)) with check (public.owns_car(car_id));
create policy findings_all_own on public.findings for all to authenticated
  using (public.owns_car(car_id)) with check (public.owns_car(car_id));
create policy checklist_all_own on public.checklist_items for all to authenticated
  using (public.owns_car(car_id)) with check (public.owns_car(car_id));

-- reports: dealer can read own and toggle hidden_sections. Creating/publishing
-- (credit deduction + published_at) happens in a security-definer function in Phase 5,
-- so a client can never publish without paying a credit.
create policy reports_select_own on public.reports for select to authenticated
  using (public.owns_car(car_id));
create policy reports_update_own on public.reports for update to authenticated
  using (public.owns_car(car_id)) with check (public.owns_car(car_id));
revoke insert, update, delete on public.reports from anon, authenticated;
grant update (hidden_sections) on public.reports to authenticated;

-- payments: read-only for the dealer; written only by the server (service role) via webhook.
create policy payments_select_own on public.payments for select to authenticated
  using (dealer_id = (select auth.uid()));
revoke insert, update, delete on public.payments from anon, authenticated;

-- ===== Storage =====
-- logos: public read (shown on public reports), dealer writes only inside their own folder.
-- inspection-photos: private, dealer reads/writes only their own folder {dealer_id}/{car_id}/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('logos', 'logos', true, 2097152, array['image/png','image/jpeg','image/webp']),
  ('inspection-photos', 'inspection-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy logos_write_own on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy logos_update_own on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy logos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy photos_rw_own on storage.objects for all to authenticated
  using (bucket_id = 'inspection-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'inspection-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
