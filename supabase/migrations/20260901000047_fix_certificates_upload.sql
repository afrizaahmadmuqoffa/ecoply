-- ============================================
-- FASE 5 FIX: Drop policy upload sertifikat yang tidak terpakai
--
-- Bucket 'certificates' memang dirancang service-role only (migrasi 01).
-- PDF diupload lewat admin client pada server action issue_certificate.
-- Policy "certificates: owning company can upload" (dari migrasi 46)
-- tidak lagi dibutuhkan dan berpotensi mengecoh — dihapus.
--
-- Aman dijalankan walau migrasi 46 belum pernah jalan (DROP POLICY
-- pada policy yang tidak ada akan error hanya jika IF EXISTS dihilangkan).
-- ============================================

DROP POLICY IF EXISTS "certificates: owning company can upload"
  ON storage.objects;