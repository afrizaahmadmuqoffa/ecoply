-- ============================================
-- Company: NIB (Nomor Induk Berusaha)
-- Diisi & wajib di form profil/onboarding perusahaan (OSS, 13 digit)
-- ============================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS nib TEXT;
COMMENT ON COLUMN public.companies.nib IS
  'NIB — Nomor Induk Berusaha (OSS, 13 digit)';