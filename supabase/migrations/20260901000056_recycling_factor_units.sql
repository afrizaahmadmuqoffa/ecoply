-- ============================================
-- FASE 5: Faktor daur ulang mendukung satuan kg & ton
--
-- Faktor kini bisa disimpan per kg ATAU per ton (unit = 'kg' | 'tonne').
-- Helper menerima p_unit = satuan listing marketplace ('kg' / 'ton' / 'pcs'):
--   * 'ton' / 'tonne' / 't'  → cari faktor ber-unit 'tonne'
--   * lainnya (kg, pcs, ...) → cari faktor ber-unit 'kg'
-- Fallback: bila unit yang diminta tak tersedia, pakai faktor 'kg'
-- (berat pickup selalu dicatat dalam kg).
-- Prioritas: material (scoped kategori) → kategori; lalu preferensi unit.
--
-- issue_certificate kini menghitung CO2e sesuai unit faktor:
--   co2e = berat(kg) × net_ef / (unit_faktor 'tonne' ? 1000 : 1)
-- dan menyimpan ef_unit ('kg' | 'tonne') di kolom certificates.ef_unit.
-- ============================================

-- Hapus signature lama (2 param) agar tidak ambigu
DROP FUNCTION IF EXISTS public.recycling_avoided_ef(text, text);

CREATE OR REPLACE FUNCTION public.recycling_avoided_ef(
  p_category text,
  p_material text,
  p_unit text DEFAULT 'kg'
)
RETURNS TABLE (
  virgin_ef_kg_co2e   numeric(18, 8),
  recycled_ef_kg_co2e numeric(18, 8),
  avoided_ef_kg_co2e  numeric(18, 8),
  ef_source           text,
  ef_year             smallint,
  ef_unit             text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH wanted(s) AS (
    SELECT CASE WHEN lower(trim(p_unit)) IN ('ton', 'tonne', 't') THEN 'tonne' ELSE 'kg' END
  ),
  candidates AS (
    -- (a) Faktor material spesifik, scoped by kategori
    SELECT f.virgin_ef_kg_co2e, f.recycled_ef_kg_co2e,
           f.virgin_ef_kg_co2e - f.recycled_ef_kg_co2e AS avoided_ef_kg_co2e,
           f.source, f.year_reference, f.unit,
           (f.unit = (SELECT s FROM wanted)) AS exact, 0 AS prio
    FROM public.recycling_avoided_factors f
    WHERE f.unit IN ('kg', 'tonne')
      AND f.is_active = true
      AND lower(trim(f.material_name)) = lower(trim(p_material))
      AND (f.category IS NULL OR lower(trim(f.category)) = lower(trim(p_category)))
    UNION ALL
    -- (b) Faktor kategori sebagai fallback
    SELECT f.virgin_ef_kg_co2e, f.recycled_ef_kg_co2e,
           f.virgin_ef_kg_co2e - f.recycled_ef_kg_co2e AS avoided_ef_kg_co2e,
           f.source, f.year_reference, f.unit,
           (f.unit = (SELECT s FROM wanted)) AS exact, 1 AS prio
    FROM public.recycling_avoided_factors f
    WHERE f.unit IN ('kg', 'tonne')
      AND f.is_active = true
      AND lower(trim(f.material_name)) = lower(trim(p_category))
      AND f.category IS NULL
  )
  SELECT c.virgin_ef_kg_co2e, c.recycled_ef_kg_co2e, c.avoided_ef_kg_co2e,
         c.source, c.year_reference, c.unit AS ef_unit
  FROM candidates c
  ORDER BY c.prio, c.exact DESC, (c.unit = 'kg') DESC
  LIMIT 1;
$$;

-- ------------------------------------------------------------
-- issue_certificate: perhitungan sadar satuan
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_certificate(
  p_manifest_id uuid,
  p_pdf_url text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_manifest record;
  v_listing record;
  v_bid record;
  v_company record;
  v_recycler record;
  v_pickup record;
  v_weight numeric;
  v_virgin_ef   numeric;
  v_recycled_ef numeric;
  v_net_ef      numeric;
  v_ef_source   text;
  v_ef_year     smallint;
  v_ef_unit     text;
  v_unit_dim    numeric;
  v_co2e numeric;
  v_certificate_id uuid;
  v_certificate record;
BEGIN
  SELECT c.id INTO v_company_id
  FROM public.companies c
  WHERE c.user_id = auth.uid();

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Company profile not found');
  END IF;

  IF p_pdf_url IS NULL OR length(p_pdf_url) < 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'URL sertifikat tidak valid');
  END IF;

  SELECT * INTO v_manifest FROM public.manifests WHERE id = p_manifest_id;
  IF v_manifest.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Manifest tidak ditemukan');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.waste_listings wl
    WHERE wl.id = v_manifest.listing_id
      AND wl.company_id = v_company_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  IF v_manifest.status NOT IN ('confirmed', 'certificate_issued') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Transaction belum dikonfirmasi');
  END IF;

  SELECT wl.* INTO v_listing FROM public.waste_listings wl WHERE wl.id = v_manifest.listing_id;
  SELECT mb.* INTO v_bid FROM public.marketplace_bids mb WHERE mb.id = v_manifest.bid_id;
  SELECT c.* INTO v_company FROM public.companies c WHERE c.id = v_listing.company_id;
  SELECT r.* INTO v_recycler FROM public.recyclers r WHERE r.id = v_bid.recycler_id;

  SELECT pr.* INTO v_pickup FROM public.pickup_records pr WHERE pr.manifest_id = p_manifest_id;

  IF v_pickup.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Data pickup belum tersedia');
  END IF;

  v_weight := v_pickup.net_weight_kg;

  -- Faktor (material → kategori), menyesuaikan satuan listing
  SELECT e.virgin_ef_kg_co2e, e.recycled_ef_kg_co2e, e.avoided_ef_kg_co2e,
         e.ef_source, e.ef_year, e.ef_unit
  INTO v_virgin_ef, v_recycled_ef, v_net_ef, v_ef_source, v_ef_year, v_ef_unit
  FROM public.recycling_avoided_ef(v_listing.category, v_listing.material_type, v_listing.unit) e;

  IF v_virgin_ef IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Faktor emisi daur ulang belum tersedia untuk "' ||
               COALESCE(v_listing.material_type, v_listing.category) ||
               '". Tambahkan lewat Admin → Carbon Config → tab "Daur Ulang".'
    );
  END IF;

  IF v_net_ef < 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'EF material virgin harus lebih besar dari EF material daur ulang untuk "' ||
               v_listing.material_type || '".'
    );
  END IF;

  -- berat pickup selalu kg; konversi jika faktor per ton
  v_unit_dim := CASE WHEN v_ef_unit = 'tonne' THEN 1000::numeric ELSE 1::numeric END;
  v_co2e := round(v_weight * v_net_ef / v_unit_dim, 2);

  SELECT c.id INTO v_certificate_id
  FROM public.certificates c
  WHERE c.manifest_id = p_manifest_id
  ORDER BY c.issued_at DESC
  LIMIT 1;

  IF v_certificate_id IS NOT NULL THEN
    SELECT * INTO v_certificate FROM public.certificates WHERE id = v_certificate_id;
    RETURN jsonb_build_object('ok', true, 'certificate', row_to_json(v_certificate)::jsonb);
  END IF;

  INSERT INTO public.certificates (
    manifest_id, company_name, recycler_name, material_type,
    weight_kg, co2e_avoided_kg,
    virgin_ef_kg_co2e, recycled_ef_kg_co2e, ef_source, ef_unit,
    pdf_url
  ) VALUES (
    p_manifest_id,
    COALESCE(v_company.name, 'Perusahaan'),
    COALESCE(v_recycler.name, 'Recycler'),
    v_listing.material_type,
    v_weight,
    v_co2e,
    v_virgin_ef,
    v_recycled_ef,
    COALESCE(v_ef_source, 'recycling_avoided_factors'),
    v_ef_unit,
    p_pdf_url
  )
  RETURNING id INTO v_certificate_id;

  SELECT * INTO v_certificate FROM public.certificates WHERE id = v_certificate_id;

  UPDATE public.manifests
  SET status = 'certificate_issued', updated_at = now()
  WHERE id = p_manifest_id;

  RETURN jsonb_build_object('ok', true, 'certificate', row_to_json(v_certificate)::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.recycling_avoided_ef(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.recycling_avoided_ef(text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.issue_certificate(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.issue_certificate(uuid, text) TO authenticated;