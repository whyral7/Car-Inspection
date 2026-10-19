-- Inspection photos are stored at inspection-photos/cars/{car_id}/{angle_key}.jpg.
-- Replace the {dealer_id}/... folder rule with one that checks the dealer owns the car in the path.

-- Reads the car id out of "cars/<uuid>/...". Returns null for any other shape, so a malformed
-- name is simply denied instead of raising a cast error inside the policy.
create function private.photo_car_id(p_name text) returns uuid
language sql stable set search_path = '' as $$
  select case
    when (storage.foldername(p_name))[1] = 'cars'
     and (storage.foldername(p_name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(p_name))[2])::uuid
  end;
$$;
revoke execute on function private.photo_car_id(text) from public, anon;
grant execute on function private.photo_car_id(text) to authenticated;

alter policy photos_rw_own on storage.objects
  using (bucket_id = 'inspection-photos' and private.owns_car(private.photo_car_id(name)))
  with check (bucket_id = 'inspection-photos' and private.owns_car(private.photo_car_id(name)));
