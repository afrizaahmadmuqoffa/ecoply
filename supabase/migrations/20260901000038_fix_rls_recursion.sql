-- ============================================
-- STEP 1: Drop policy yang menyebabkan rekursi
-- ============================================
DROP POLICY IF EXISTS "Recyclers can view listings they bid on" ON public.waste_listings;
DROP POLICY IF EXISTS "Parties involved can view bids" ON public.marketplace_bids;

-- ============================================
-- STEP 2: Buat SECURITY DEFINER helper functions
-- Function ini bypass RLS, sehingga tidak memicu rekursi
-- ============================================

-- Cek apakah user punya bid di listing tertentu
CREATE OR REPLACE FUNCTION public.user_has_bid_on_listing(p_listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.marketplace_bids mb
    JOIN public.recyclers r ON mb.recycler_id = r.id
    WHERE mb.listing_id = p_listing_id
      AND r.user_id = auth.uid()
  );
$$;

-- Cek apakah user adalah owner listing tertentu
CREATE OR REPLACE FUNCTION public.user_owns_listing(p_listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.waste_listings wl
    JOIN public.companies c ON wl.company_id = c.id
    WHERE wl.id = p_listing_id
      AND c.user_id = auth.uid()
  );
$$;

-- Cek apakah user adalah owner bid tertentu (via listing)
CREATE OR REPLACE FUNCTION public.user_owns_bid_listing(p_bid_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.marketplace_bids mb
    JOIN public.waste_listings wl ON mb.listing_id = wl.id
    JOIN public.companies c ON wl.company_id = c.id
    WHERE mb.id = p_bid_id
      AND c.user_id = auth.uid()
  );
$$;

-- Cek apakah user adalah pemilik bid (recycler)
CREATE OR REPLACE FUNCTION public.user_is_bid_owner(p_bid_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.marketplace_bids mb
    JOIN public.recyclers r ON mb.recycler_id = r.id
    WHERE mb.id = p_bid_id
      AND r.user_id = auth.uid()
  );
$$;

-- Revoke execute dari public (hanya authenticated yang bisa pakai)
REVOKE ALL ON FUNCTION public.user_has_bid_on_listing(uuid) FROM public;
REVOKE ALL ON FUNCTION public.user_owns_listing(uuid) FROM public;
REVOKE ALL ON FUNCTION public.user_owns_bid_listing(uuid) FROM public;
REVOKE ALL ON FUNCTION public.user_is_bid_owner(uuid) FROM public;

GRANT EXECUTE ON FUNCTION public.user_has_bid_on_listing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_listing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_bid_listing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_bid_owner(uuid) TO authenticated;

-- ============================================
-- STEP 3: Buat policy baru menggunakan SECURITY DEFINER functions
-- ============================================

-- waste_listings: Recycler bisa lihat listing yang sudah mereka bid
CREATE POLICY "Recyclers can view listings they bid on"
ON public.waste_listings
FOR SELECT
USING (public.user_has_bid_on_listing(id));

-- marketplace_bids: Parties involved bisa lihat bids
CREATE POLICY "Parties involved can view bids"
ON public.marketplace_bids
FOR SELECT
USING (
  public.user_owns_bid_listing(id)
  OR public.user_is_bid_owner(id)
);

-- marketplace_bids: Company owner bisa update bids di listing mereka
DROP POLICY IF EXISTS "Company owner can update bids on their listings" ON public.marketplace_bids;
CREATE POLICY "Company owner can update bids on their listings"
ON public.marketplace_bids
FOR UPDATE
USING (public.user_owns_bid_listing(id))
WITH CHECK (public.user_owns_bid_listing(id));

-- marketplace_bids: Recycler bisa update bid miliknya
DROP POLICY IF EXISTS "Recyclers can update their own bids" ON public.marketplace_bids;
CREATE POLICY "Recyclers can update their own bids"
ON public.marketplace_bids
FOR UPDATE
USING (public.user_is_bid_owner(id))
WITH CHECK (public.user_is_bid_owner(id));

-- marketplace_bids: Recycler bisa delete bid miliknya yang masih pending
DROP POLICY IF EXISTS "Recyclers can delete their own bids" ON public.marketplace_bids;
CREATE POLICY "Recyclers can delete their own bids"
ON public.marketplace_bids
FOR DELETE
USING (
  public.user_is_bid_owner(id)
  AND status = 'pending'
);