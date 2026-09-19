-- ============================================
-- FASE 5: Verifikasi manifest bertingkat (Level 1/2/3)
--
-- Halaman /verify/manifest/[manifest_no] harus menampilkan data
-- sesuai level akses viewer:
--
--   Level 1 — Publik (anon & login apa pun yang bukan pihak terkait):
--       manifest valid, material, berat, tanggal, dan nama company +
--       recycler DISENSOR sebagian.
--   Level 2 — Pihak terkait (company.user_id atau recycler.user_id
--       dari manifest tersebut): nama lengkap + detail transaksi
--       (harga, alamat, jadwal pickup). Diverifikasi via auth.uid().
--   Level 3 — Admin (profiles.role = 'admin'): semua data tanpa filter.
--
-- Semua keputusan dilakukan DI DALAM RPC (SECURITY DEFINER), bukan di
-- client — client hanya menerima JSON sesuai levelnya.
-- ============================================

-- ------------------------------------------------------------
-- 1) Helper: sensor nama sebagian untuk tampilan publik.
--    Contoh: "PT Sumber Jaya" (13 char) -> "PT *********a"
--            "Budi" (4 char) -> "B***"
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redact_partner_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
RETURNS NULL ON NULL INPUT
AS $$
  SELECT CASE
    WHEN length(p_name) <= 2 THEN p_name
    WHEN length(p_name) <= 5 THEN left(p_name, 1) || repeat('*', length(p_name) - 1)
    ELSE left(p_name, 2) || repeat('*', length(p_name) - 4) || right(p_name, 1)
  END
$$;

-- ------------------------------------------------------------
-- 2) get_public_manifest DIULANG: kembalikan data sesuai level
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
  v_bid      public.marketplace_bids%ROWTYPE;
  v_company  record;
  v_recycler record;
  v_pickup   record;
  v_cert     record;
  v_weight   numeric;
  v_cert_url text;
  v_viewer_role text;
  v_level    int;
  v_data     jsonb;
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

  SELECT mb.* INTO v_bid
  FROM public.marketplace_bids mb
  WHERE mb.id = v_manifest.bid_id;

  SELECT c.* INTO v_company
  FROM public.companies c
  WHERE c.id = v_listing.company_id;

  SELECT rec.* INTO v_recycler
  FROM public.recyclers rec
  WHERE rec.id = v_bid.recycler_id;

  SELECT pr.* INTO v_pickup
  FROM public.pickup_records pr
  WHERE pr.manifest_id = v_manifest.id
  LIMIT 1;

  SELECT c.* INTO v_cert
  FROM public.certificates c
  WHERE c.manifest_id = v_manifest.id
  ORDER BY c.issued_at DESC
  LIMIT 1;

  v_weight := v_pickup.net_weight_kg;
  v_cert_url := v_cert.pdf_url;

  -- ------------------------------------------------------------
  -- Tentukan level akses berdasarkan session (auth.uid())
  -- ------------------------------------------------------------
  v_level := 1;
  IF auth.uid() IS NOT NULL THEN
    SELECT p.role INTO v_viewer_role
    FROM public.profiles p
    WHERE p.id = auth.uid();

    IF v_viewer_role = 'admin' THEN
      v_level := 3;
    ELSIF auth.uid() IN (v_company.user_id, v_recycler.user_id) THEN
      v_level := 2;
    END IF;
  END IF;

  -- Level 1 (publik): field dasar, nama disensor
  v_data := jsonb_build_object(
    'level', v_level,
    'manifest_no', v_manifest.manifest_no,
    'status', v_manifest.status,
    'created_at', v_manifest.created_at,
    'attended_at', v_manifest.attended_at,
    'listing_id', v_manifest.listing_id,
    'material_type', v_listing.material_type,
    'weight_kg', v_weight,
    'certificate_url', v_cert_url,
    'company_name', COALESCE(public.redact_partner_name(v_company.name), 'Perusahaan'),
    'recycler_name', COALESCE(public.redact_partner_name(v_recycler.name), 'Recycler')
  );

  -- Level 2+: nama lengkap + detail transaksi
  IF v_level >= 2 THEN
    v_data := v_data || jsonb_build_object(
      'company_name', COALESCE(v_company.name, 'Perusahaan'),
      'recycler_name', COALESCE(v_recycler.name, 'Recycler'),
      'transaction', jsonb_build_object(
        'price', v_bid.price,
        'unit', v_listing.unit,
        'address_text', v_listing.address_text,
        'pickup_scheduled_at', v_bid.pickup_scheduled_at,
        'pickup_address', v_bid.pickup_address,
        'pickup_note', v_bid.pickup_note,
        'pickup_recorded_at', v_manifest.recycler_confirmed_at,
        'confirmed_at', v_manifest.company_confirmed_at
      )
    );
  END IF;

  -- Level 3 (admin): semua data tanpa filter
  IF v_level >= 3 THEN
    v_data := v_data || jsonb_build_object(
      'internal', jsonb_build_object(
        'manifest_id', v_manifest.id,
        'bid_id', v_manifest.bid_id,
        'company_id', v_listing.company_id,
        'recycler_id', v_recycler.id,
        'bid_note', v_bid.note,
        'bid_initiator', v_bid.initiator,
        'pickup_recorded_by', v_pickup.recorded_by,
        'photo_evidence_count', CASE WHEN v_pickup.photo_evidence IS NULL
                                     THEN 0 ELSE array_length(v_pickup.photo_evidence, 1) END,
        'certificate_id', v_cert.id,
        'certificate_issued_at', v_cert.issued_at
      )
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'data', v_data);
END;
$$;

-- ------------------------------------------------------------
-- GRANT: anon tetap bisa (Level 1), authenticated juga.
-- Helper redact_partner_name cukup dijalankan oleh definer fungsi.
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_public_manifest(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_manifest(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_manifest(text) TO authenticated;