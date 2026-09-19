-- ============================================
-- FASE 5: Faktor "Campuran" di-scope per kategori
--
-- Masalah: material_name = "Campuran" bersifat global (unique(material_name,
-- unit)), sehingga faktor "Plastik - Campuran" ikut dipakai listing
-- "Campuran" kategori lain (Kertas, Logam, ...) → salah.
--
-- Solusi: tambah kolom `category`. Resolusi helper:
--   (a) material spesifik, ditegaskan cocok juga dengan kategori listing:
--       material_name = p_material  AND (category IS NULL OR category = p_category)
--   (b) fallback faktor kategori: material_name = p_category  AND category IS NULL
--
-- PET/HDPE dll tetap global (category NULL → berlaku semua kategori).
-- "Campuran" disimpan dengan category = kategori listing → hanya dipakai
-- kategori yang sama.
-- ============================================

-- Kolom kategori (opsional)
ALTER TABLE public.recycling_avoided_factors
  ADD COLUMN IF NOT EXISTS category text;

-- Uniqueness kini per (material_name, category, unit)
ALTER TABLE public.recycling_avoided_factors
  DROP CONSTRAINT IF EXISTS recycling_avoided_factors_material_name_unit_key;

CREATE UNIQUE INDEX IF NOT EXISTS recycling_avoided_factors_key_unique
  ON public.recycling_avoided_factors (material_name, COALESCE(category, ''), unit);

-- Helper di-redefinisi dengan scoping kategori
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
  -- (a) Faktor material spesifik, scoped by kategori (bila di-set)
  SELECT f.virgin_ef_kg_co2e, f.recycled_ef_kg_co2e,
         f.virgin_ef_kg_co2e - f.recycled_ef_kg_co2e AS avoided_ef_kg_co2e,
         f.source, f.year_reference
  FROM public.recycling_avoided_factors f
  WHERE f.unit = 'kg'
    AND f.is_active = true
    AND lower(trim(f.material_name)) = lower(trim(p_material))
    AND (f.category IS NULL OR lower(trim(f.category)) = lower(trim(p_category)))
  UNION ALL
  -- (b) Faktor kategori sebagai fallback (material_name = nama kategori)
  SELECT f.virgin_ef_kg_co2e, f.recycled_ef_kg_co2e,
         f.virgin_ef_kg_co2e - f.recycled_ef_kg_co2e AS avoided_ef_kg_co2e,
         f.source, f.year_reference
  FROM public.recycling_avoided_factors f
  WHERE f.unit = 'kg'
    AND f.is_active = true
    AND lower(trim(f.material_name)) = lower(trim(p_category))
    AND f.category IS NULL
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.recycling_avoided_ef(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.recycling_avoided_ef(text, text) TO authenticated;