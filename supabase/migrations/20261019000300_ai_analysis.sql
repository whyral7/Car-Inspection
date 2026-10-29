-- Phase 4: AI photo analysis, findings review and token usage logging.

-- ===== Photo version stamp =====
-- Bumped on every update. A retake upserts the row, so the analysis route can tell that the photo
-- it sent to the model is no longer the current one and throw the stale result away.
alter table public.inspection_photos add column updated_at timestamptz not null default now();

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- clock_timestamp, not now(): two updates in quick succession must get different stamps.
  new.updated_at := clock_timestamp();
  return new;
end $$;
revoke execute on function private.touch_updated_at() from public, anon, authenticated;

create trigger inspection_photos_touch_updated_at
  before update on public.inspection_photos
  for each row execute function private.touch_updated_at();

-- ===== Save one photo's analysis atomically =====
-- Replaces the photo's AI findings, then records the status and raw output, all in one transaction.
-- Runs as the caller (security invoker), so RLS still limits it to the dealer's own photos.
-- Returns false, and changes nothing, when the photo was retaken or analysed since p_expected_updated_at.
create function public.save_photo_analysis(
  p_photo_id uuid,
  p_expected_updated_at timestamptz,
  p_ai_status text,
  p_ai_findings jsonb,
  p_findings jsonb
) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  v_car_id uuid;
begin
  -- The row lock makes a second, concurrent save wait, then see the bumped stamp and give up.
  select car_id into v_car_id
    from public.inspection_photos
   where id = p_photo_id and updated_at = p_expected_updated_at
     for update;
  if not found then
    return false;
  end if;

  -- Notes the dealer added themselves (source = 'dealer') are kept.
  delete from public.findings where photo_id = p_photo_id and source = 'ai';

  insert into public.findings (car_id, photo_id, type, location, severity, note, source, accepted)
  select v_car_id, p_photo_id, f.type, nullif(f.location, ''), f.severity, nullif(f.note, ''), 'ai', false
    from jsonb_to_recordset(coalesce(p_findings, '[]'::jsonb)) as f(type text, location text, severity text, note text);

  update public.inspection_photos
     set ai_status = p_ai_status, ai_findings = p_ai_findings
   where id = p_photo_id;

  return true;
end $$;
revoke execute on function public.save_photo_analysis(uuid, timestamptz, text, jsonb, jsonb) from public, anon;
grant execute on function public.save_photo_analysis(uuid, timestamptz, text, jsonb, jsonb) to authenticated;

-- ===== Token usage =====
-- One row per model call (a retry after invalid JSON is a second row). Written by the server with
-- the service role; dealers can't read or write it. car_id is kept nullable so spend history
-- survives a deleted car.
create table public.ai_usage (
  id bigint generated always as identity primary key,
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  car_id uuid references public.cars(id) on delete set null,
  photo_id uuid references public.inspection_photos(id) on delete set null,
  angle_key text,
  model text not null,
  attempt smallint not null,
  outcome text not null check (outcome in ('ok','invalid_json','refused','api_error')),
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_creation_input_tokens int not null default 0,
  cache_read_input_tokens int not null default 0,
  cost_usd numeric(12,6),
  created_at timestamptz not null default now()
);
create index ai_usage_car_id_idx on public.ai_usage (car_id);
create index ai_usage_photo_id_created_at_idx on public.ai_usage (photo_id, created_at);

alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

-- Spend per car. Read it in the SQL editor:  select * from ai_usage_by_car order by last_call_at desc;
create view public.ai_usage_by_car with (security_invoker = true) as
select
  u.car_id,
  c.reg_number,
  u.dealer_id,
  count(*) as api_calls,
  count(distinct u.photo_id) as photos,
  sum(u.input_tokens) as input_tokens,
  sum(u.output_tokens) as output_tokens,
  sum(u.cache_creation_input_tokens + u.cache_read_input_tokens) as cache_tokens,
  round(sum(u.cost_usd), 4) as cost_usd,
  min(u.created_at) as first_call_at,
  max(u.created_at) as last_call_at
from public.ai_usage u
left join public.cars c on c.id = u.car_id
group by u.car_id, c.reg_number, u.dealer_id;
revoke all on public.ai_usage_by_car from anon, authenticated;
