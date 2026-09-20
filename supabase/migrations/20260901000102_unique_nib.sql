-- ============================================================
-- NIB UNIQUE (per-tabel)
--
--  - companies.nib unik, recyclers.nib unik
--  - NULL dan '' tetap diizinkan (partial unique index)
--
-- Jika ada data duplikat, migration BERHENTI tanpa mengubah data.
-- Bersihkan dulu dengan query bantu di bawah, lalu ulangi.
--
-- Query bantu untuk menemukan duplikat:
--   SELECT nib, count(*) FROM public.companies
--     WHERE nib IS NOT NULL AND  nib <> '' GROUP BY nib HAVING count(*) > 1;
--   SELECT nib, count(*) FROM public.recyclers
--     WHERE nib IS NOT NULL AND nib <> '' GROUP BY nib HAVING count(*) > 1;
-- ============================================================

-- 1) Deteksi duplikat → hentikan migration tanpa mengubah data
DO $$
DECLARE
  v_c_nib int;
  v_r_nib int;
BEGIN
  SELECT count(*) INTO v_c_nib FROM (
    SELECT nib FROM public.companies
    WHERE nib IS NOT NULL AND nib <> '' GROUP BY nib HAVING count(*) > 1
  ) d;

  SELECT count(*) INTO v_r_nib FROM (
    SELECT nib FROM public.recyclers
    WHERE nib IS NOT NULL AND nib <> '' GROUP BY nib HAVING count(*) > 1
  ) d;

  IF v_c_nib + v_r_nib > 0 THEN
    RAISE EXCEPTION
      'Duplikat NIB ditemukan: companies.nib=% recyclers.nib=%. Kosongkan duplikatnya dulu (lihat query bantu di header), lalu ulangi migration.',
      v_c_nib, v_r_nib;
  END IF;
END $$;

-- 2) Partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_nib_unique
  ON public.companies (nib)
  WHERE nib IS NOT NULL AND nib <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_recyclers_nib_unique
  ON public.recyclers (nib)
  WHERE nib IS NOT NULL AND nib <> '';