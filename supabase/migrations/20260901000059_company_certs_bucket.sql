-- ============================================================
-- FASE 5: Storage bucket sertifikat perusahaan
-- Referensi: migrasi 33 (recycler certifications v2)
-- Menambahkan storage bucket 'company-certs' dan policies mirip
-- recycler, disesuaikan untuk company (user_id = owner)
-- ============================================================

-- 1) Buat storage bucket untuk sertifikat perusahaan
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-certs', 'company-certs', true)
ON CONFLICT (id) DO NOTHING;

-- 2) Policy: Perusahaan bisa upload sertifikat sendiri
CREATE POLICY "Perusahaan bisa upload sertifikatnya sendiri"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-certs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3) Policy: Perusahaan bisa melihat sertifikatnya sendiri
CREATE POLICY "Perusahaan bisa melihat sertifikatnya sendiri"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'company-certs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4) Policy: Perusahaan bisa menghapus sertifikatnya sendiri
CREATE POLICY "Perusahaan bisa menghapus sertifikatnya sendiri"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-certs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5) Policy: Admin bisa melihat semua sertifikat perusahaan
CREATE POLICY "Admin bisa melihat semua sertifikat perusahaan"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'company-certs'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);