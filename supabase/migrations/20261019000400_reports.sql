-- Phase 5: publish a report (1 credit), report PDFs and small photo copies.

-- ===== Report rows =====
alter table public.reports
  add constraint reports_slug_format check (slug ~ '^[a-z0-9]{8,32}$'),
  add constraint reports_hidden_sections_known check (hidden_sections <@ array['photos','findings','checklist','documents']::text[]);

-- ===== Report PDFs =====
-- Private. Only the server (service role) writes them; buyers download through /r/<slug>/pdf,
-- which hands out a short-lived signed link. No storage policies, so dealers can't touch them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('reports', 'reports', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

-- ===== Publish =====
-- Called only by the server with the service role, after it has checked the signed-in dealer owns the
-- car and worked out the score with lib/score.ts. The dealer can't call it directly, so a client can't
-- publish with a made-up score or without paying.
--
-- First publish: takes 1 credit, creates the report with p_slug and marks the car published, all in
-- one transaction. Publishing again (an already published car) is free: it refreshes the score and
-- hidden sections and keeps the original slug, so links already shared keep working.
--
-- Raises 'car_not_found', 'not_ready' (inspection not finished) or 'no_credits'.
create function public.publish_report(
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
  -- Lock order everywhere: car, then dealer. The car lock makes a double tap wait and then see the
  -- report already published; the dealer lock stops two cars spending the same last credit.
  select status into v_status from public.cars where id = p_car_id and dealer_id = p_dealer_id for update;
  if not found then
    raise exception 'car_not_found';
  end if;
  if v_status = 'draft' then
    raise exception 'not_ready';
  end if;

  select credits into v_credits from public.dealers where id = p_dealer_id for update;

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

  update public.dealers set credits = credits - 1 where id = p_dealer_id;

  insert into public.reports (car_id, slug, score, hidden_sections, published_at)
  values (p_car_id, p_slug, p_score, coalesce(p_hidden_sections, '{}'), now())
  on conflict (car_id) do update
    set slug = excluded.slug, score = excluded.score, hidden_sections = excluded.hidden_sections, published_at = excluded.published_at;

  update public.cars set status = 'published' where id = p_car_id;

  return jsonb_build_object('slug', p_slug, 'charged', true, 'credits', v_credits - 1);
end $$;
revoke execute on function public.publish_report(uuid, uuid, text, numeric, text[]) from public, anon, authenticated;
grant execute on function public.publish_report(uuid, uuid, text, numeric, text[]) to service_role;

-- Public pages look reports up by slug (already unique, so indexed).

-- ===== Small photo copies =====
-- The browser also uploads a 640 px copy of each photo to cars/<car_id>/small/<angle_key>.jpg for the
-- report gallery and PDF. The existing photos_rw_own policy already covers it: private.photo_car_id
-- reads the car id from the second folder, and that is the same for the small/ subfolder.
