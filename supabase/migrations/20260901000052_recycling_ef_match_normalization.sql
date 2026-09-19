-- ============================================
-- FASE 5: Perbaikan resolusi faktor daur ulang
--
-- 1) Pemadanan KEBAL huruf besar/kecil (case-insensitive) + trim.
--    Admin cukup menyalin nama material/kategori dari constants marketplace;
--    "pet" tetap cocok dengan "PET", " kaca " dengan "Kaca".
--
-- 2) Material generik "Lainnya" / "Campuran" (kategori Organik, Elektronik,
--    dan campuran di Plastik/Kertas/Logam/Kaca) DILEWATKAN saat pencarian
--    material — langsung pakai faktor KATEGORI. Ini mencegah salah ambil
--    faktor material lain / faktor Lainnya yang tidak bermakna.
--
-- Spesifikasi helper:
--   selection.virgin_ef − selection.recycled_ef  → net EF (kg CO2e/kg)
--   Prioritas: (a) material spesifik, (b) kategori.
--   Seluruh entri harus unit='kg' dan is_active=true.
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
  -- (a) Faktor material spesifik — kecuali material generik (Lainnya/Campuran)
  SELECT f.virgin_ef_kg_co2e, f.recycled_ef_kg_co2e,
         f.virgin_ef_kg_co2e - f.recycled_ef_kg_co2e AS avoided_ef_kg_co2e,
         f.source, f.year_reference
  FROM public.recycling_avoided_factors f
  WHERE f.unit = 'kg'
    AND f.is_active = true
    AND lower(trim(f.material_name)) = lower(trim(p_material))
    AND lower(trim(p_material)) NOT IN ('lainnya', 'campuran')
  UNION ALL
  -- (b) Faktor kategori sebagai fallback (juga untuk Lainnya/Campuran)
  SELECT f.virgin_ef_kg_co2e, f.recycled_ef_kg_co2e,
         f.virgin_ef_kg_co2e - f.recycled_ef_kg_co2e AS avoided_ef_kg_co2e,
         f.source, f.year_reference
  FROM public.recycling_avoided_factors f
  WHERE f.unit = 'kg'
    AND f.is_active = true
    AND lower(trim(f.material_name)) = lower(trim(p_category))
  LIMIT 1
$$;

-- Grant tetap sama
REVOKE ALL ON FUNCTION public.recycling_avoided_ef(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.recycling_avoided_ef(text, text) TO authenticated;