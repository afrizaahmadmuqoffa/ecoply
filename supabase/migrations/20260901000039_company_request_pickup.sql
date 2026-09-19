-- ============================================
-- RPC: Get Recyclers Within Radius (untuk company browse recycler)
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
    -- Reverse geocode address (simplified - pakai raw address jika ada)
    'Fasilitas ' || r.name AS address_text,
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

-- ============================================
-- RLS: Izinkan company melihat recycler & recycler_details
-- (diperlukan untuk browse recycler page)
-- ============================================
DROP POLICY IF EXISTS "Companies can view active recyclers" ON public.recyclers;
CREATE POLICY "Companies can view active recyclers"
ON public.recyclers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c 
    WHERE c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Companies can view recycler details" ON public.recycler_details;
CREATE POLICY "Companies can view recycler details"
ON public.recycler_details
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c 
    WHERE c.user_id = auth.uid()
  )
);

-- ============================================
-- RLS: Izinkan company insert bid dengan initiator='company'
-- ============================================
DROP POLICY IF EXISTS "Companies can request pickup" ON public.marketplace_bids;
CREATE POLICY "Companies can request pickup"
ON public.marketplace_bids
FOR INSERT
WITH CHECK (
  initiator = 'company'
  AND EXISTS (
    SELECT 1 FROM public.companies c 
    WHERE c.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.recycler_details rd
    WHERE rd.recycler_id = marketplace_bids.recycler_id
      AND rd.is_active = true
  )
);

-- ============================================
-- RLS: Recycler bisa lihat bids yang ditujukan ke mereka
-- (untuk terima request dari company)
-- ============================================
DROP POLICY IF EXISTS "Recyclers can view bids targeting them" ON public.marketplace_bids;
CREATE POLICY "Recyclers can view bids targeting them"
ON public.marketplace_bids
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.recyclers r
    WHERE r.id = marketplace_bids.recycler_id
      AND r.user_id = auth.uid()
  )
);

-- ============================================
-- RLS: Recycler bisa update bid yang ditujukan ke mereka
-- (untuk accept/reject request dari company)
-- ============================================
DROP POLICY IF EXISTS "Recyclers can update bids targeting them" ON public.marketplace_bids;
CREATE POLICY "Recyclers can update bids targeting them"
ON public.marketplace_bids
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.recyclers r
    WHERE r.id = marketplace_bids.recycler_id
      AND r.user_id = auth.uid()
  )
  AND initiator = 'company'  -- hanya bisa update request dari company
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recyclers r
    WHERE r.id = marketplace_bids.recycler_id
      AND r.user_id = auth.uid()
  )
  AND initiator = 'company'
);