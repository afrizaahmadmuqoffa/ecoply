-- ============================================
-- RPC: Recycler merespons Request Pickup dari Company
-- (accept / reject)
--
-- LATAR BELAKANG:
-- Sebelumnya update bid/listing dilakukan lewat query RLS per-user.
-- Recycler TIDAK punya policy UPDATE di waste_listings, sehingga
-- UPDATE status ke 'dealing' diblokir RLS secara diam-diam
-- (listing tetap 'open', recycler lain masih bisa bid/accept).
--
-- RPC ini SECURITY DEFINER (bypass RLS) tapi melakukan SEMUA
-- validasi otorisasi DI DALAM fungsi:
--   - hanya recycler tujuan yang bisa merespons
--   - hanya request initiator='company' dengan status pending
--   - saat accept: bid -> accepted, listing -> 'dealing',
--     bid pending lain di listing yang sama -> rejected,
--     buat chat thread (get-or-create)
--
-- IDEMPOTENT: aman dijalankan ulang.
-- ============================================
CREATE OR REPLACE FUNCTION public.recycler_respond_company_request(
  p_bid_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recycler_id uuid;
  v_bid record;
  v_listing_company_id uuid;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('accept', 'reject') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Parameter tidak valid');
  END IF;

  -- 1) User harus terdaftar sebagai recycler
  SELECT r.id INTO v_recycler_id
  FROM public.recyclers r
  WHERE r.user_id = auth.uid();

  IF v_recycler_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Recycler profile not found');
  END IF;

  -- 2) Ambil request
  SELECT mb.id, mb.listing_id, mb.recycler_id, mb.status, mb.initiator
  INTO v_bid
  FROM public.marketplace_bids mb
  WHERE mb.id = p_bid_id;

  IF v_bid.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Request tidak ditemukan');
  END IF;

  -- 3) Validasi otorisasi
  IF v_bid.recycler_id <> v_recycler_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;
  IF v_bid.initiator <> 'company' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Request bukan dari company');
  END IF;
  IF v_bid.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Request sudah diproses sebelumnya');
  END IF;

  -- 4) REJECT: cukup update status
  IF p_action = 'reject' THEN
    UPDATE public.marketplace_bids mb
    SET status = 'rejected', updated_at = now()
    WHERE mb.id = p_bid_id;
    RETURN jsonb_build_object('ok', true);
  END IF;

  -- 5) ACCEPT: transaksi lengkap
  UPDATE public.marketplace_bids mb
  SET status = 'accepted', updated_at = now()
  WHERE mb.id = p_bid_id
    AND mb.status = 'pending';

  -- Tolak bid pending lain (recycler lain maupun request lain) di listing yang sama
  UPDATE public.marketplace_bids mb
  SET status = 'rejected', updated_at = now()
  WHERE mb.listing_id = v_bid.listing_id
    AND mb.id <> p_bid_id
    AND mb.status = 'pending';

  -- Listing otomatis 'dealing' (Negosiasi), hanya dari status 'open'
  UPDATE public.waste_listings wl
  SET status = 'dealing', updated_at = now()
  WHERE wl.id = v_bid.listing_id
    AND wl.status = 'open';

  -- Chat thread (get-or-create)
  SELECT wl.company_id INTO v_listing_company_id
  FROM public.waste_listings wl
  WHERE wl.id = v_bid.listing_id;

  IF v_listing_company_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.chat_threads ct
    WHERE ct.listing_id = v_bid.listing_id
      AND ct.company_id = v_listing_company_id
      AND ct.recycler_id = v_recycler_id
  ) THEN
    INSERT INTO public.chat_threads (listing_id, company_id, recycler_id)
    VALUES (v_bid.listing_id, v_listing_company_id, v_recycler_id);
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.recycler_respond_company_request(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.recycler_respond_company_request(uuid, text) TO authenticated;