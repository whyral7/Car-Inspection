-- Market price estimate on the report: Claude searches current listings for comparable cars and
-- submits a range for a car in average condition. The app adjusts it for the car's condition score
-- when the report is shown (lib/price/estimate.ts), so it follows later changes to notes or checklist.

create table public.price_estimates (
  car_id uuid primary key references public.cars(id) on delete cascade,
  market_low_inr int not null check (market_low_inr > 0),
  market_high_inr int not null check (market_high_inr >= market_low_inr),
  summary text,
  -- [{title, url, price_inr, year, km}], only links that appeared in the search results.
  comparables jsonb not null default '[]',
  city text,
  model text not null,
  searched_at timestamptz not null default now()
);

alter table public.price_estimates enable row level security;

-- The owner reads their own estimates. Only the server (service role) writes them, after checking
-- the signed-in user owns the car, so a range on a report always came from the search.
create policy price_estimates_select_own on public.price_estimates for select to authenticated
  using (private.owns_car(car_id));
revoke insert, update, delete, truncate on public.price_estimates from anon, authenticated;

-- The estimate is a report section the owner can hide, like photos or the checklist.
alter table public.reports drop constraint reports_hidden_sections_known;
alter table public.reports
  add constraint reports_hidden_sections_known
  check (hidden_sections <@ array['photos','findings','checklist','documents','price']::text[]);

-- Usage log: tell price estimates apart from photo checks, and count web searches ($0.01 each).
alter table public.ai_usage
  add column purpose text not null default 'photo_analysis' check (purpose in ('photo_analysis', 'price_estimate')),
  add column web_search_requests int not null default 0;
create index ai_usage_car_id_purpose_created_at_idx on public.ai_usage (car_id, purpose, created_at);
