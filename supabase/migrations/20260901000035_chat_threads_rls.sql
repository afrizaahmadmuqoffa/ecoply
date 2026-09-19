-- Chat Threads & Messages RLS: policy INSERT/UPDATE yang hilang

-- ============================================
-- POLICY 1: Company pemilik listing bisa buat thread
-- ============================================
CREATE POLICY "Company owner can create chat threads"
ON public.chat_threads
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.waste_listings wl
    JOIN public.companies c ON wl.company_id = c.id
    WHERE wl.id = chat_threads.listing_id
      AND c.user_id = auth.uid()
      AND chat_threads.company_id = c.id
  )
);

-- ============================================
-- POLICY 2: Recycler bisa buat thread untuk listing yang dia bid
-- ============================================
CREATE POLICY "Recycler can create chat threads for bid listings"
ON public.chat_threads
FOR INSERT
WITH CHECK (
  -- Harus recycler yang valid
  EXISTS (
    SELECT 1 
    FROM public.recyclers r
    WHERE r.id = chat_threads.recycler_id
      AND r.user_id = auth.uid()
  )
  -- Dan harus sudah ada bid di listing tersebut
  AND EXISTS (
    SELECT 1 
    FROM public.marketplace_bids mb
    WHERE mb.listing_id = chat_threads.listing_id
      AND mb.recycler_id = chat_threads.recycler_id
  )
);

-- ============================================
-- POLICY 3: Participants bisa update thread
-- (untuk fitur close/archive thread di masa depan)
-- ============================================
CREATE POLICY "Thread participants can update threads"
ON public.chat_threads
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.companies c 
          WHERE c.id = chat_threads.company_id AND c.user_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM public.recyclers r 
          WHERE r.id = chat_threads.recycler_id AND r.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.companies c 
          WHERE c.id = chat_threads.company_id AND c.user_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM public.recyclers r 
          WHERE r.id = chat_threads.recycler_id AND r.user_id = auth.uid())
);

-- ============================================
-- POLICY 4: Participants bisa update read_at di messages
-- (untuk fitur read receipt)
-- ============================================
CREATE POLICY "Thread participants can mark messages read"
ON public.chat_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_threads t 
    WHERE t.id = chat_messages.thread_id 
      AND (
        EXISTS (SELECT 1 FROM public.companies c 
                WHERE c.id = t.company_id AND c.user_id = auth.uid())
        OR
        EXISTS (SELECT 1 FROM public.recyclers r 
                WHERE r.id = t.recycler_id AND r.user_id = auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_threads t 
    WHERE t.id = chat_messages.thread_id 
      AND (
        EXISTS (SELECT 1 FROM public.companies c 
                WHERE c.id = t.company_id AND c.user_id = auth.uid())
        OR
        EXISTS (SELECT 1 FROM public.recyclers r 
                WHERE r.id = t.recycler_id AND r.user_id = auth.uid())
      )
  )
);