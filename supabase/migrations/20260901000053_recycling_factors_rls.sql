-- ============================================
-- FASE 5: RLS untuk tabel recycling_avoided_factors
--
-- Jika tabel sempat dibuat lewat dashboard (RLS auto-ON tanpa policy),
-- insert dari server action admin akan gagal dengan
-- "new row violates row-level security policy".
--
-- Pendekatan (menghindari klausa TO pada CREATE POLICY yang ditolak
-- SQL editor di sebagian versi):
--   * Privilege role: anon = SELECT saja; authenticated = ALL.
--   * Policy: SELECT (semua) + write ALL (hanya role yang punya grant).
--   * service_role: dibypass RLS dan diberi grant penuh.
-- ============================================

ALTER TABLE public.recycling_avoided_factors ENABLE ROW LEVEL SECURITY;

-- Batasi hak tabel secara eksplisit per role (gantikan default PUBLIC).
REVOKE ALL ON public.recycling_avoided_factors FROM anon, authenticated, public;
GRANT SELECT ON public.recycling_avoided_factors TO anon, authenticated;
GRANT ALL ON public.recycling_avoided_factors TO authenticated;
GRANT ALL ON public.recycling_avoided_factors TO service_role;

-- Policy (tanpa klausa TO → berlaku untuk semua role, dikontrol via grants)
DROP POLICY IF EXISTS "recycling_factors_select" ON public.recycling_avoided_factors;
DROP POLICY IF EXISTS "recycling_factors_insert" ON public.recycling_avoided_factors;
DROP POLICY IF EXISTS "recycling_factors_update" ON public.recycling_avoided_factors;
DROP POLICY IF EXISTS "recycling_factors_delete" ON public.recycling_avoided_factors;
DROP POLICY IF EXISTS "recycling_factors_write" ON public.recycling_avoided_factors;

CREATE POLICY "recycling_factors_select"
  ON public.recycling_avoided_factors
  FOR SELECT
  USING (true);

CREATE POLICY "recycling_factors_write"
  ON public.recycling_avoided_factors
  FOR ALL
  USING (true)
  WITH CHECK (true);