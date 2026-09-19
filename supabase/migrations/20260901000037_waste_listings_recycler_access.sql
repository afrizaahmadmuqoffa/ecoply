-- Izinkan recycler melihat listing yang sudah mereka bid
-- (diperlukan untuk akses detail listing & chat setelah bid diterima)

CREATE POLICY "Recyclers can view listings they bid on"
ON public.waste_listings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.marketplace_bids mb
    WHERE mb.listing_id = waste_listings.id
      AND mb.recycler_id IN (
        SELECT r.id 
        FROM public.recyclers r 
        WHERE r.user_id = auth.uid()
      )
  )
);