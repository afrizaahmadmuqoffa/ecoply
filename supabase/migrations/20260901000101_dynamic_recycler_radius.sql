-- ============================================================
-- Radius layanan dinamis sesuai pengaturan recycler
--
-- Sebelumnya company membrowse recycler dengan konstanta 100 km
-- (p_radius_km). Kini batas mengikuti ruang lingkup layanan tiap
-- recycler (recycler_details.service_radius_km):
--   - browse: recycler tampil hanya jika lokasi company berada dalam
--     radius layanan recycler tsb
--   - request: company_send_request_pickup MENOLAK recycler di luar
--     jangkauan (mencegah bypass lewat pemanggilan RPC langsung)
--
-- Lokasi company & recycler sama-sama geography(Point), jadi
-- ST_DWithin langsung valid. service_radius_km NULL => di luar
-- jangkauan (NULL * 1000 -> NULL -> gagal filter).
-- ============================================================

-- ------------------------------------------------------------
-- 1) Rewrite browse RPC tanpa p_radius_km
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_recyclers_within_radius(
  double precision, double precision, double precision, text
);

CREATE OR REPLACE FUNCTION public.get_recyclers_within_radius(
  p_lat double precision,
  p_lng double precision,
  p_material_filter text DEFAULT NULL
)
RETURNS TABLE (
  recycler_id uuid,
  recycler_name text,
  logo_url text,
  verification_status text,
  accepted_materials text[],
  capacity_per_month numeric,
  service_radius_km numeric,
  address_text text,
  distance_km double precision,
  certifications jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id AS recycler_id,
    r.name AS recycler_name,
    r.logo_url,
    r.verification_status,
    rd.accepted_materials,
    rd.capacity_per_month,
    rd.service_radius_km,
    COALESCE(
      NULLIF(rd.address_text, ''),
      NULLIF(r.address, ''),
      'Fasilitas ' || r.name
    ) AS address_text,
    ROUND(
      (ST_Distance(
        rd.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) / 1000)::numeric,
      2
    )::double precision AS distance_km,
    rd.certifications
  FROM public.recyclers r
  JOIN public.recycler_details rd ON rd.recycler_id = r.id
  WHERE rd.is_active = true
    AND rd.location IS NOT NULL
    -- Jangkauan mengikuti radius layanan recycler, bukan konstanta
    AND rd.service_radius_km IS NOT NULL
    AND ST_DWithin(
      rd.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      rd.service_radius_km * 1000
    )
    AND (
      p_material_filter IS NULL
      OR p_material_filter = ANY(rd.accepted_materials)
    )
  ORDER BY distance_km ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_recyclers_within_radius(
  double precision, double precision, text
) TO authenticated;

-- ------------------------------------------------------------
-- 2) Gate jarak di RPC request pickup (bulk validation dalam fungsi)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.company_send_request_pickup(
  p_listing_id uuid,
  p_recycler_id uuid,
  p_price numeric,
  p_note text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_recycler_id uuid;
  v_new_id uuid;
  v_row jsonb;
BEGIN
  -- 1) User harus terdaftar sebagai company
  SELECT c.id INTO v_company_id
  FROM public.companies c
  WHERE c.user_id = auth.uid();

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Company profile not found');
  END IF;

  -- 2) Listing harus milik company ini dan status open
  IF NOT EXISTS (
    SELECT 1 FROM public.waste_listings wl
    WHERE wl.id = p_listing_id
      AND wl.company_id = v_company_id
      AND wl.status = 'open'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Listing tidak ditemukan atau sudah tidak tersedia');
  END IF;

  -- 3) Recycler target harus aktif
  SELECT rd.recycler_id INTO v_recycler_id
  FROM public.recycler_details rd
  WHERE rd.recycler_id = p_recycler_id
    AND rd.is_active = true;

  IF v_recycler_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Recycler tujuan tidak aktif');
  END IF;

  -- 4) Jarak company-recycler harus dalam radius layanan recycler
  IF NOT EXISTS (
    SELECT 1
    FROM public.companies c
    JOIN public.recycler_details rd ON rd.recycler_id = p_recycler_id
    WHERE c.id = v_company_id
      AND c.location IS NOT NULL
      AND rd.location IS NOT NULL
      AND rd.service_radius_km IS NOT NULL
      AND ST_DWithin(
        rd.location::geography,
        c.location::geography,
        rd.service_radius_km * 1000
      )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Recycler di luar jangkauan layanan');
  END IF;

  -- 5) Cegah duplikat request pending untuk listing & recycler yang sama
  IF EXISTS (
    SELECT 1 FROM public.marketplace_bids mb
    WHERE mb.listing_id = p_listing_id
      AND mb.recycler_id = p_recycler_id
      AND mb.initiator = 'company'
      AND mb.status = 'pending'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Request pickup sudah dikirim ke recycler ini untuk listing ini');
  END IF;

  -- 6) Insert request
  INSERT INTO public.marketplace_bids (listing_id, recycler_id, price, initiator, note, status)
  VALUES (p_listing_id, p_recycler_id, p_price, 'company', p_note, 'pending')
  RETURNING id INTO v_new_id;

  SELECT to_jsonb(mb.*)
  INTO v_row
  FROM public.marketplace_bids mb
  WHERE mb.id = v_new_id;

  RETURN jsonb_build_object('ok', true, 'data', v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.company_send_request_pickup(uuid, uuid, numeric, text) FROM public;
GRANT EXECUTE ON FUNCTION public.company_send_request_pickup(uuid, uuid, numeric, text) TO authenticated;