-- ============================================================
-- FASE 5: Sertifikasi perusahaan
-- Menambahkan kolom certifications (jsonb) ke tabel companies
-- agar company bisa menyimpan nama + URL sertifikat seperti recycler
-- ============================================================

-- Kolom certifications bertipe jsonb: array of {name, file_url, uploaded_at}
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS certifications jsonb NOT NULL DEFAULT '[]'::jsonb;