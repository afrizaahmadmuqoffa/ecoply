-- ============================================
-- FASE 5: Kehadiran recycler via scan QR
--
-- Menjadikan QR sebagai bukti kehadiran:
--   * manifests.attended_at  → kapan recycler memindai QR di lokasi
--   * RPC recycler_mark_attended → dipanggil saat recycler membuka
--     halaman verifikasi hasil scan. Hanya winning recycler.
--   * record_pickup kini DIVALIDASI: bot tombol hanya bisa dicatat
--     jika attended_at sudah terisi (harus scan QR dulu).
--
-- Migration sebelumnya (44-48) kemungkinan sudah jalan di DB user,
-- jadi definisi record_pickup & get_public_manifest dibuat ulang di sini.
-- Aman di-run setelah migrasi 46/48.
-- ============================================

-- ------------------------------------------------------------
-- 1) Kolom attended_at
-- ------------------------------------------------------------
ALTER TABLE public.manifests
  ADD COLUMN IF NOT EXISTS attended_at timestamptz;

-- ------------------------------------------------------------
-- 2) RPC: Recycler mencatat kehadiran (scan QR → buka halaman verifikasi)
--    Idempotent: jika sudah tercatat, kembalikan timestamp yang ada.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recycler_mark_attended(p_manifest_no text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recycler_id uuid;
  v_manifest record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated', 'error', 'Login dulu untuk mencatat kehadiran');
  END IF;

  SELECT r.id INTO v_recycler_id
  FROM public.recyclers r
  WHERE r.user_id = auth.uid();

  IF v_recycler_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_recycler', 'error', 'Hanya akun recycler yang bisa mencatat kehadiran');
  END IF;

  SELECT m.* INTO v_manifest
  FROM public.manifests m
  WHERE m.manifest_no = p_manifest_no;

  IF v_manifest.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid', 'error', 'Manifest tidak ditemukan');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.marketplace_bids mb
    WHERE mb.id = v_manifest.bid_id
      AND mb.recycler_id = v_recycler_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized', 'error', 'Anda bukan recycler untuk manifest ini');
  END IF;

  IF v_manifest.status NOT IN ('issued', 'pickup_recorded') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'closed', 'error', 'Manifest ini tidak lagi menerima pencatatan kehadiran');
  END IF;

  IF v_manifest.attended_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'attended', to_jsonb(v_manifest.attended_at));
  END IF;

  UPDATE public.manifests
  SET attended_at = now(), updated_at = now()
  WHERE id = v_manifest.id;

  RETURN jsonb_build_object('ok', true, 'attended', to_jsonb(now()));
END;
$$;

-- ------------------------------------------------------------
-- 3) record_pickup DIULANG: wajib attended_at terisi dulu
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_pickup(
  p_manifest_id uuid,
  p_net_weight_kg numeric,
  p_photos text[]
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recycler_id uuid;
  v_manifest record;
  v_record_id uuid;
BEGIN
  -- 1) Hanya recycler terdaftar
  SELECT r.id INTO v_recycler_id
  FROM public.recyclers r
  WHERE r.user_id = auth.uid();

  IF v_recycler_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Recycler profile not found');
  END IF;

  -- 2) Manifest harus ada
  SELECT * INTO v_manifest
  FROM public.manifests
  WHERE id = p_manifest_id;

  IF v_manifest.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Manifest tidak ditemukan');
  END IF;

  -- 3) Recycler harus pemilik bid pada listing manifest
  IF NOT EXISTS (
    SELECT 1 FROM public.marketplace_bids mb
    WHERE mb.id = v_manifest.bid_id
      AND mb.recycler_id = v_recycler_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  -- 4) Gate: kehadiran harus tercatat dulu (QR dipindai di lokasi)
  IF v_manifest.attended_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Kehadiran di lokasi belum tercatat. Pindai QR yang ditampilkan perusahaan di lokasi pickup.');
  END IF;

  -- 5) Hanya bisa dicatat sekali, saat status masih 'issued'
  IF v_manifest.status <> 'issued' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pickup sudah dicatat sebelumnya');
  END IF;

  IF p_net_weight_kg IS NULL OR p_net_weight_kg <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Berat bersih harus lebih dari 0');
  END IF;

  INSERT INTO public.pickup_records (manifest_id, net_weight_kg, photo_evidence, recorded_by)
  VALUES (p_manifest_id, p_net_weight_kg, COALESCE(p_photos, '{}'::text[]), auth.uid())
  RETURNING id INTO v_record_id;

  UPDATE public.manifests
  SET status = 'pickup_recorded',
      recycler_confirmed_at = now(),
      updated_at = now()
  WHERE id = p_manifest_id;

  RETURN jsonb_build_object('ok', true, 'record_id', v_record_id);
END;
$$;

-- ------------------------------------------------------------
-- 4) get_public_manifest DIULANG: tambah attended_at + listing_id
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_manifest(p_manifest_no text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_manifest public.manifests%ROWTYPE;
  v_listing  public.waste_listings%ROWTYPE;
  v_company  public.companies%ROWTYPE;
  v_recycler public.recyclers%ROWTYPE;
  v_weight   numeric;
  v_cert_url text;
BEGIN
  IF p_manifest_no IS NULL OR length(p_manifest_no) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nomor manifest tidak valid');
  END IF;

  SELECT m.* INTO v_manifest
  FROM public.manifests m
  WHERE m.manifest_no = p_manifest_no;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Manifest tidak ditemukan');
  END IF;

  SELECT wl.* INTO v_listing
  FROM public.waste_listings wl
  WHERE wl.id = v_manifest.listing_id;

  SELECT c.* INTO v_company
  FROM public.companies c
  WHERE c.id = v_listing.company_id;

  SELECT rec.* INTO v_recycler
  FROM public.recyclers rec
  JOIN public.marketplace_bids mb ON mb.recycler_id = rec.id
  WHERE mb.id = v_manifest.bid_id;

  SELECT pr.net_weight_kg INTO v_weight
  FROM public.pickup_records pr
  WHERE pr.manifest_id = v_manifest.id
  LIMIT 1;

  SELECT c.pdf_url INTO v_cert_url
  FROM public.certificates c
  WHERE c.manifest_id = v_manifest.id
  ORDER BY c.issued_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'manifest_no', v_manifest.manifest_no,
      'status', v_manifest.status,
      'created_at', v_manifest.created_at,
      'attended_at', v_manifest.attended_at,
      'listing_id', v_manifest.listing_id,
      'material_type', v_listing.material_type,
      'weight_kg', v_weight,
      'company_name', COALESCE(v_company.name, 'Perusahaan'),
      'recycler_name', COALESCE(v_recycler.name, 'Recycler'),
      'certificate_url', v_cert_url
    )
  );
END;
$$;

-- ------------------------------------------------------------
-- GRANT
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.recycler_mark_attended(text) FROM public;
REVOKE ALL ON FUNCTION public.record_pickup(uuid, numeric, text[]) FROM public;
REVOKE ALL ON FUNCTION public.get_public_manifest(text) FROM public;

GRANT EXECUTE ON FUNCTION public.recycler_mark_attended(text) TO anon;
GRANT EXECUTE ON FUNCTION public.recycler_mark_attended(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_pickup(uuid, numeric, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_manifest(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_manifest(text) TO authenticated;