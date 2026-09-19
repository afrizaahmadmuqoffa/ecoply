-- Tampilkan SEMUA status listing kepada recycler dalam radius
-- (open/dealing/confirmed/completed/cancelled).
--
-- Sebelumnya hanya 'open' (plus dealing/confirmed yang recycler punya bid
-- accepted) yang dikembalikan, sehingga listing 'completed'/'cancelled'
-- tidak pernah muncul di feed recycler. Status gate dihapus; UI yang
-- menampilkan filter status.
CREATE OR REPLACE FUNCTION public.get_listings_within_radius(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision,
  p_accepted_materials text[] DEFAULT NULL::text[],
  p_recycler_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  id uuid,
  company_id uuid,
  company_name text,
  material_type text,
  category text,
  weight numeric,
  unit text,
  address_text text,
  photos text[],
  pickup_schedule text,
  free_for_pickup boolean,
  status text,
  distance_km double precision,
  my_bid_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    wl.id,
    wl.company_id,
    c.name AS company_name,
    wl.material_type,
    wl.category,
    wl.weight,
    wl.unit,
    wl.address_text,
    wl.photos,
    wl.pickup_schedule,
    wl.free_for_pickup,
    wl.status,
    ROUND(
      (ST_Distance(
        wl.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) / 1000)::numeric,
      2
    )::double precision AS distance_km,
    -- Status bid recycler untuk listing ini (jika ada)
    (
      SELECT mb.status
      FROM public.marketplace_bids mb
      WHERE mb.listing_id = wl.id
        AND mb.recycler_id = p_recycler_id
      ORDER BY mb.created_at DESC
      LIMIT 1
    ) AS my_bid_status
  FROM public.waste_listings wl
  JOIN public.companies c ON wl.company_id = c.id
  WHERE
    -- Filter radius
    ST_DWithin(
      wl.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000
    )
    -- Filter material: jika p_accepted_materials diberikan, hanya tampilkan yang cocok
    AND (
      p_accepted_materials IS NULL
      OR (wl.category || ':' || wl.material_type) = ANY(p_accepted_materials)
    )
  ORDER BY distance_km ASC;
$function$
;

GRANT EXECUTE ON FUNCTION public.get_listings_within_radius(
  double precision, double precision, double precision, text[], uuid
) TO authenticated;