-- ============================================================
-- Bucket sertifikat: izinkan juga JPG/PNG (scan sertifikat/logo)
-- UI (accept .pdf,.jpg,.jpeg,.png) & viewer sudah mendukung gambar.
-- Whitelist eksplisit — SVG/HTML tetap dilarang. Batas 5MB tetap.
-- ============================================================
UPDATE storage.buckets
SET allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']
WHERE id IN ('recycler-certs', 'company-certs');