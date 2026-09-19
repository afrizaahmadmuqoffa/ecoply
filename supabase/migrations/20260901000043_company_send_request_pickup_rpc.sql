-- ============================================
-- RPC: Company kirim "Request Pickup" langsung ke recycler target
-- SECURITY DEFINER -> bypass RLS, tapi semua validasi otorisasi
-- dilakukan DI DALAM function (pemilik listing, status open,
-- recycler aktif, cegah duplikat pending).
-- Solusi ini juga menghindari konflik WITH CHECK antar policy INSERT
-- ("Recyclers can bid" vs "Companies can request pickup").
-- IDEMPOTENT: aman dijalankan ulang.
-- ============================================
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
  IF NOT EXISTS (
    SELECT 1 FROM public.recycler_details rd
    WHERE rd.recycler_id = p_recycler_id
      AND rd.is_active = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Recycler tujuan tidak aktif');
  END IF;

  -- 4) Cegah duplikat request pending untuk listing & recycler yang sama
  IF EXISTS (
    SELECT 1 FROM public.marketplace_bids mb
    WHERE mb.listing_id = p_listing_id
      AND mb.recycler_id = p_recycler_id
      AND mb.initiator = 'company'
      AND mb.status = 'pending'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Request pickup sudah dikirim ke recycler ini untuk listing ini');
  END IF;

  -- 5) Insert request
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