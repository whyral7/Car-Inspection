-- Keep helper functions out of the public API (Supabase security advisor 0028/0029)
-- and remove TRUNCATE, which bypasses RLS, from client roles.

-- Signup trigger function: only the trigger should run it.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Move owns_car to a schema PostgREST doesn't expose; policies still call it.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.owns_car(p_car_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cars c
                 where c.id = p_car_id and c.dealer_id = (select auth.uid()));
$$;
revoke execute on function private.owns_car(uuid) from public, anon;
grant execute on function private.owns_car(uuid) to authenticated;

alter policy photos_all_own on public.inspection_photos
  using (private.owns_car(car_id)) with check (private.owns_car(car_id));
alter policy findings_all_own on public.findings
  using (private.owns_car(car_id)) with check (private.owns_car(car_id));
alter policy checklist_all_own on public.checklist_items
  using (private.owns_car(car_id)) with check (private.owns_car(car_id));
alter policy reports_select_own on public.reports
  using (private.owns_car(car_id));
alter policy reports_update_own on public.reports
  using (private.owns_car(car_id)) with check (private.owns_car(car_id));

-- The old public.owns_car is no longer referenced. Revoke rather than drop it.
revoke execute on function public.owns_car(uuid) from public, anon, authenticated;
comment on function public.owns_car(uuid) is 'Unused: replaced by private.owns_car. Safe to drop.';

revoke truncate on all tables in schema public from anon, authenticated;
