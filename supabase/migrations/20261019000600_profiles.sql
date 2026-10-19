-- Anyone can sign up now, not just dealers. At signup a user picks "I am a: Car owner / Buying a car /
-- Dealer". The dealers table becomes profiles with a user_type column. Business name, address and logo
-- stay on the row but are optional and only used for dealers.
--
-- The dealer_id columns on cars, payments and ai_usage keep their names: they now point at profiles.

-- ===== Rename =====
alter table public.dealers rename to profiles;
alter table public.profiles rename constraint dealers_pkey to profiles_pkey;
alter table public.profiles rename constraint dealers_id_fkey to profiles_id_fkey;
alter table public.profiles rename constraint dealers_credits_check to profiles_credits_check;
alter policy dealers_select_own on public.profiles rename to profiles_select_own;
alter policy dealers_update_own on public.profiles rename to profiles_update_own;

-- ===== User type =====
-- Null until the user answers the question at signup (the signup trigger creates the row first).
alter table public.profiles
  add column user_type text check (user_type in ('car_owner', 'buyer', 'dealer'));

-- Everyone who finished signing up before this change signed up as a dealer. Anyone who stopped
-- half-way is asked the question when they next open the app.
update public.profiles set user_type = 'dealer'
 where owner_name is not null and business_name is not null;

grant update (user_type) on public.profiles to authenticated;

comment on table public.profiles is 'One row per user (car owner, buyer or dealer). Created by the signup trigger.';
comment on column public.profiles.business_name is 'Dealers only, optional.';
comment on column public.profiles.address is 'Dealers only, optional.';
comment on column public.profiles.logo_path is 'Dealers only, optional.';
comment on column public.cars.dealer_id is 'The profile that owns this car (any user type).';
comment on column public.payments.dealer_id is 'The profile that bought the credits (any user type).';
comment on column public.ai_usage.dealer_id is 'The profile whose photo was analysed (any user type).';

-- ===== Functions =====
-- Function bodies look tables up by name when they run, so each one that used public.dealers is
-- replaced. Same signatures, so existing grants and revokes stay as they are.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, phone) values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.publish_report(
  p_dealer_id uuid,
  p_car_id uuid,
  p_slug text,
  p_score numeric,
  p_hidden_sections text[]
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_status text;
  v_credits int;
  v_slug text;
begin
  -- Lock order everywhere: car, then profile. The car lock makes a double tap wait and then see the
  -- report already published; the profile lock stops two cars spending the same last credit.
  select status into v_status from public.cars where id = p_car_id and dealer_id = p_dealer_id for update;
  if not found then
    raise exception 'car_not_found';
  end if;
  if v_status = 'draft' then
    raise exception 'not_ready';
  end if;

  select credits into v_credits from public.profiles where id = p_dealer_id for update;

  select slug into v_slug from public.reports where car_id = p_car_id and published_at is not null;
  if found then
    update public.reports
       set score = p_score, hidden_sections = coalesce(p_hidden_sections, '{}')
     where car_id = p_car_id;
    return jsonb_build_object('slug', v_slug, 'charged', false, 'credits', v_credits);
  end if;

  if v_credits < 1 then
    raise exception 'no_credits';
  end if;

  update public.profiles set credits = credits - 1 where id = p_dealer_id;

  insert into public.reports (car_id, slug, score, hidden_sections, published_at)
  values (p_car_id, p_slug, p_score, coalesce(p_hidden_sections, '{}'), now())
  on conflict (car_id) do update
    set slug = excluded.slug, score = excluded.score, hidden_sections = excluded.hidden_sections, published_at = excluded.published_at;

  update public.cars set status = 'published' where id = p_car_id;

  return jsonb_build_object('slug', p_slug, 'charged', true, 'credits', v_credits - 1);
end $$;

create or replace function public.apply_razorpay_payment(p_order_id text, p_payment_id text, p_amount_paise int)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_payment public.payments%rowtype;
  v_credits int;
begin
  -- Lock the order row first, so two deliveries of the same payment run one after the other.
  -- Lock order everywhere: this row, then the profile (publish_report: car, then profile).
  select * into v_payment from public.payments where razorpay_order_id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  if v_payment.status = 'paid' then
    if v_payment.razorpay_payment_id = p_payment_id then
      return jsonb_build_object('status', 'duplicate', 'dealer_id', v_payment.dealer_id);
    end if;
    -- Razorpay allows one successful payment per order, so this shouldn't happen. Never credit twice.
    return jsonb_build_object('status', 'order_already_paid', 'dealer_id', v_payment.dealer_id);
  end if;

  if p_amount_paise <> v_payment.amount_paise then
    raise exception 'amount_mismatch';
  end if;

  -- A failed attempt on the same order can be followed by a successful retry, so 'failed' -> 'paid' is fine.
  update public.payments
     set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now(), failure_reason = null
   where id = v_payment.id;

  update public.profiles set credits = credits + v_payment.credits
   where id = v_payment.dealer_id
   returning credits into v_credits;

  return jsonb_build_object(
    'status', 'credited',
    'dealer_id', v_payment.dealer_id,
    'credits_added', v_payment.credits,
    'credits', v_credits
  );
end $$;

-- Let the Data API see the renamed table straight away.
notify pgrst, 'reload schema';
