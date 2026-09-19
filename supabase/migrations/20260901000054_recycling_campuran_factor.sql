-- ============================================
-- FASE 5: "Campuran" kini punya faktor sendiri
--
-- Constants marketplace: kategori Organik & Elektronik memakai
-- "Campuran" (bukan "Lainnya"). Admin dapat mengisi faktor untuk
-- material "Campuran" (memang ada faktor emisi campuran).
--
-- Helper DIREVISI: hapus pengecualian "Lainnya"/"Campuran" pada
-- pencarian material. Kini:
--   * "Campuran"   → cari faktor material "Campuran", fallback kategori.
--   * "Lainnya"    → (listing lama) cari faktor "Lainnya", fallback kategori.
-- Case-insensitive + trim tetap berlaku.
-- ============================================

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
  -- (a) Faktor material spesifik (termasuk "Campuran")
  SELECT f.virgin_ef_kg_co2e, f.recycled_ef_kg_co2e,
         f.virgin_ef_kg_co2e - f.recycled_ef_kg_co2e AS avoided_ef_kg_co2e,
         f.source, f.year_reference
  FROM public.recycling_avoided_factors f
  WHERE f.unit = 'kg'
    AND f.is_active = true
    AND lower(trim(f.material_name)) = lower(trim(p_material))
  UNION ALL
  -- (b) Faktor kategori sebagai fallback
  SELECT f.virgin_ef_kg_co2e, f.recycled_ef_kg_co2e,
         f.virgin_ef_kg_co2e - f.recycled_ef_kg_co2e AS avoided_ef_kg_co2e,
         f.source, f.year_reference
  FROM public.recycling_avoided_factors f
  WHERE f.unit = 'kg'
    AND f.is_active = true
    AND lower(trim(f.material_name)) = lower(trim(p_category))
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.recycling_avoided_ef(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.recycling_avoided_ef(text, text) TO authenticated;