-- ============================================
-- Recycler: NIB (Nomor Induk Berusaha) + address_text persist
-- 1) recyclers.nib        : NIB OSS (13 digit), diisi & wajib di form profil recycler
-- 2) recycler_details.address_text : alamat hasil reverse geocoding (auto-fill),
--    dipersist agar tidak hilang saat edit profil
-- 3) Patch RPC get_recyclers_within_radius: tampilkan alamat asli
--    (priority: recycler_details.address_text -> recyclers.address -> fallback)
-- ============================================

ALTER TABLE public.recyclers
  ADD COLUMN IF NOT EXISTS nib TEXT;
COMMENT ON COLUMN public.recyclers.nib IS
  'NIB — Nomor Induk Berusaha (OSS, 13 digit)';

ALTER TABLE public.recycler_details
  ADD COLUMN IF NOT EXISTS address_text TEXT;
COMMENT ON COLUMN public.recycler_details.address_text IS
  'Alamat lengkap hasil reverse geocoding (auto-fill)';

-- ============================================
-- RPC: tampilkan alamat asli, bukan placeholder
-- ============================================
CREATE OR REPLACE FUNCTION public.get_recyclers_within_radius(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision,
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
    AND ST_DWithin(
      rd.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000
    )
    AND (
      p_material_filter IS NULL
      OR p_material_filter = ANY(rd.accepted_materials)
    )
  ORDER BY distance_km ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_recyclers_within_radius(
  double precision, double precision, double precision, text
) TO authenticated;