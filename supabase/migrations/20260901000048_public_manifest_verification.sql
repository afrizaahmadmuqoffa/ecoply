-- ============================================
-- FASE 5: Halaman verifikasi publik untuk manifest
--
-- RPC ini dipanggil TANPA autentikasi (role anon) dari halaman
-- /verify/manifest/[manifest_no]. Hanya mengembalikan data kecil
-- yang memang boleh publik:
--   manifest_no, status, tanggal, material, berat bersih,
--   nama company & recycler, URL sertifikat publik.
--
-- Tidak membocorkan data sensitif (alamat, harga, dokumen privat).
-- Behavior: STABLE + SECURITY DEFINER (bisa baca tabel ber-RLS
-- sebagai pemilik fungsi).
-- ============================================
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

REVOKE ALL ON FUNCTION public.get_public_manifest(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_manifest(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_manifest(text) TO authenticated;