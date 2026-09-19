-- ============================================================
-- MERGE SEGMENT: hapus 'menengah', jadikan satu 'non_umkm'
--
-- companies.segment: umkm | menengah | besar  →  umkm | non_umkm
-- Data lama 'menengah' & 'besar' dimigrasi jadi 'non_umkm'.
-- (Dijalankan setelah migration 71 yang membuat kolom segment.)
-- ============================================================

UPDATE public.companies
SET segment = 'non_umkm'
WHERE segment IN ('menengah', 'besar');

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_segment_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_segment_check
  CHECK (segment IN ('umkm', 'non_umkm'));