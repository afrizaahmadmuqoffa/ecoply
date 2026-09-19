-- Marketplace Bids RLS: policy UPDATE & DELETE yang hilang

-- ============================================
-- POLICY 1: Company pemilik listing bisa update bid
-- (untuk accept/reject bid dari recycler)
-- ============================================
CREATE POLICY "Company owner can update bids on their listings"
ON public.marketplace_bids
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM public.waste_listings wl
    JOIN public.companies c ON wl.company_id = c.id
    WHERE wl.id = marketplace_bids.listing_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.waste_listings wl
    JOIN public.companies c ON wl.company_id = c.id
    WHERE wl.id = marketplace_bids.listing_id
      AND c.user_id = auth.uid()
  )
);

-- ============================================
-- POLICY 2: Recycler bisa update bid miliknya sendiri
-- (untuk cancel bid sendiri)
-- ============================================
CREATE POLICY "Recyclers can update their own bids"
ON public.marketplace_bids
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM public.recyclers r
    WHERE r.id = marketplace_bids.recycler_id
      AND r.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.recyclers r
    WHERE r.id = marketplace_bids.recycler_id
      AND r.user_id = auth.uid()
  )
);

-- ============================================
-- POLICY 3: Recycler bisa delete bid miliknya
-- (untuk tarik bid sebelum diproses company)
-- ============================================
CREATE POLICY "Recyclers can delete their own bids"
ON public.marketplace_bids
FOR DELETE
USING (
  EXISTS (
    SELECT 1 
    FROM public.recyclers r
    WHERE r.id = marketplace_bids.recycler_id
      AND r.user_id = auth.uid()
  )
  AND marketplace_bids.status = 'pending'  -- hanya bisa delete jika masih pending
);