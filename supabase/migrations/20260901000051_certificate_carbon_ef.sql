-- ============================================
-- FASE 5: Sertifikat — Avoided Emissions dari EF virgin & daur ulang
--
-- Rumus (beda per material, dikelola admin via UI):
--
--   co2e_terhindar (kg) = berat_didaur_ulang (kg)
--                         × (EF_material_virgin − EF_material_daur_ulang)
--                        [kg CO2e / kg]
--
-- Faktor virgin & faktor daur ulang disimpan DUA kolom per material di
-- tabel public.recycling_avoided_factors. TIDAK DI-SEED — nilainya
-- diisi admin lewat Admin → Carbon Config → tab "Daur Ulang".
--
-- Konvensi penamaan agar lookup berhasil:
--   * material_name = persis material_type listing marketplace
--     (mis. PET, HDPE, Aluminium, Kardus/Corrugated, ...)
--   * atau material_name = nama KATEGORI sebagai fallback
--     (Plastik, Kertas, Logam, Kaca, Organik, Elektronik)
--
-- Jika faktor belum tersedia, issue_certificate MENOLAK terbit dengan
-- pesan penunjuk ke UI admin.
-- ============================================

-- ------------------------------------------------------------
-- 1) TABEL faktor avoided emission per material
--    (mirip pola EF master lainnya; dikelola admin)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recycling_avoided_factors (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_name       text NOT NULL,
  unit                text NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'tonne')),
  virgin_ef_kg_co2e   numeric(18, 8) NOT NULL,  -- kg CO2e/kg material VIRGIN (yang dihindari)
  recycled_ef_kg_co2e numeric(18, 8) NOT NULL DEFAULT 0, -- kg CO2e/kg material DAUR ULANG/rPET
  source              text,
  year_reference      smallint,
  is_active           boolean NOT NULL DEFAULT true,
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (material_name, unit)
);

COMMENT ON TABLE public.recycling_avoided_factors IS
  'Faktor avoided emission daur ulang: (EF virgin − EF daur ulang) per kg, dikelola admin';

CREATE TRIGGER recycling_ef_updated_at
  BEFORE UPDATE ON public.recycling_avoided_factors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------
-- 2) HELPER: resolusi faktor untuk sertifikat daur ulang
--    Return: virgin_ef, recycled_ef, avoided_ef(=virgin−recycled), source, year.
--    Prioritas: material spesifik → kategori.
--    SECURITY DEFINER agar bisa dibaca dari sisi company/recycler.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recycling_avoided_ef(p_category text, p_material text)
RETURNS TABLE (
  virgin_ef_kg_co2e   numeric(18, 8),
  recycled_ef_kg_co2e numeric(18, 8),
  avoided_ef_kg_co2e  numeric(18, 8),
  ef_source           text,
  ef_year             smallint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.virgin_ef_kg_co2e, f.recycled_ef_kg_co2e,
         f.virgin_ef_kg_co2e - f.recycled_ef_kg_co2e AS avoided_ef_kg_co2e,
         f.source, f.year_reference
  FROM public.recycling_avoided_factors f
  WHERE f.material_name = p_material
    AND f.unit = 'kg'
    AND f.is_active = true
  UNION ALL
  SELECT f.virgin_ef_kg_co2e, f.recycled_ef_kg_co2e,
         f.virgin_ef_kg_co2e - f.recycled_ef_kg_co2e,
         f.source, f.year_reference
  FROM public.recycling_avoided_factors f
  WHERE f.material_name = p_category
    AND f.unit = 'kg'
    AND f.is_active = true
  LIMIT 1
$$;

-- ------------------------------------------------------------
-- 3) Kolom audit EF pada sertifikat (transparansi rumus & sumber)
-- ------------------------------------------------------------
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS virgin_ef_kg_co2e   numeric(18, 8),
  ADD COLUMN IF NOT EXISTS recycled_ef_kg_co2e numeric(18, 8),
  ADD COLUMN IF NOT EXISTS ef_source text,
  ADD COLUMN IF NOT EXISTS ef_unit text NOT NULL DEFAULT 'kg';

-- ------------------------------------------------------------
-- 4) issue_certificate DIULANG:
--    co2e_avoided_kg = berat × (EF virgin − EF daur ulang)
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

  -- Sertifikat diterbitkan dari status 'confirmed'
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

  -- ------------------------------------------------------------
  -- Ambil faktor dari tabel admin (material → kategori):
  --   co2e_avoided_kg = berat × (EF virgin − EF daur ulang)
  -- ------------------------------------------------------------
  SELECT e.virgin_ef_kg_co2e, e.recycled_ef_kg_co2e, e.avoided_ef_kg_co2e,
         e.ef_source, e.ef_year
  INTO v_virgin_ef, v_recycled_ef, v_net_ef, v_ef_source, v_ef_year
  FROM public.recycling_avoided_ef(v_listing.category, v_listing.material_type) e;

  IF v_virgin_ef IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Faktor emisi daur ulang belum tersedia untuk "' ||
               COALESCE(v_listing.material_type, v_listing.category) ||
               '". Tambahkan lewat Admin → Carbon Config → tab "Daur Ulang" ' ||
               '(isi EF virgin & EF daur ulang, unit kg).'
    );
  END IF;

  IF v_net_ef < 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'EF material virgin harus lebih besar dari EF material daur ulang untuk "' ||
               v_listing.material_type || '".'
    );
  END IF;

  v_co2e := round(v_weight * v_net_ef, 2);

  -- Idempotent: jika sudah terbit, kembalikan yang ada
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
    'kg',
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

-- ------------------------------------------------------------
-- GRANT
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.recycling_avoided_ef(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.recycling_avoided_ef(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.issue_certificate(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.issue_certificate(uuid, text) TO authenticated;