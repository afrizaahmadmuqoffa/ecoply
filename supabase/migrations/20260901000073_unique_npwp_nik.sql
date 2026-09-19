-- ============================================================
-- NPWP/NIK UNIQUE (per-tabel)
--
--  - companies.npwp unik, companies.nik unik
--  - recyclers.npwp unik, recyclers.nik unik
--  - NULL dan '' tetap diizinkan (partial unique index)
--
-- Jika ada data duplikat, migration BERHENTI tanpa mengubah data.
-- Bersihkan dulu dengan query bantu di bawah, lalu ulangi.
--
-- Query bantu untuk menemukan duplikat:
--   SELECT npwp, count(*) FROM public.companies
--     WHERE npwp IS NOT NULL AND npwp <> '' GROUP BY npwp HAVING count(*) > 1;
--   SELECT nik, count(*) FROM public.companies
--     WHERE nik IS NOT NULL AND nik <> '' GROUP BY nik HAVING count(*) > 1;
--   SELECT npwp, count(*) FROM public.recyclers
--     WHERE npwp IS NOT NULL AND npwp <> '' GROUP BY npwp HAVING count(*) > 1;
--   SELECT nik, count(*) FROM public.recyclers
--     WHERE nik IS NOT NULL AND nik <> '' GROUP BY nik HAVING count(*) > 1;
-- ============================================================

-- 1) Deteksi duplikat → hentikan migration tanpa mengubah data
DO $$
DECLARE
  v_c_npwp int;
  v_c_nik  int;
  v_r_npwp int;
  v_r_nik  int;
BEGIN
  SELECT count(*) INTO v_c_npwp FROM (
    SELECT npwp FROM public.companies
    WHERE npwp IS NOT NULL AND npwp <> '' GROUP BY npwp HAVING count(*) > 1
  ) d;

  SELECT count(*) INTO v_c_nik FROM (
    SELECT nik FROM public.companies
    WHERE nik IS NOT NULL AND nik <> '' GROUP BY nik HAVING count(*) > 1
  ) d;

  SELECT count(*) INTO v_r_npwp FROM (
    SELECT npwp FROM public.recyclers
    WHERE npwp IS NOT NULL AND npwp <> '' GROUP BY npwp HAVING count(*) > 1
  ) d;

  SELECT count(*) INTO v_r_nik FROM (
    SELECT nik FROM public.recyclers
    WHERE nik IS NOT NULL AND nik <> '' GROUP BY nik HAVING count(*) > 1
  ) d;

  IF v_c_npwp + v_c_nik + v_r_npwp + v_r_nik > 0 THEN
    RAISE EXCEPTION
      'Duplikat NPWP/NIK ditemukan: companies.npwp=% companies.nik=% recyclers.npwp=% recyclers.nik=%. Kosongkan duplikatnya dulu (lihat query bantu di header), lalu ulangi migration.',
      v_c_npwp, v_c_nik, v_r_npwp, v_r_nik;
  END IF;
END $$;

-- 2) Partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_npwp_unique
  ON public.companies (npwp)
  WHERE npwp IS NOT NULL AND npwp <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_nik_unique
  ON public.companies (nik)
  WHERE nik IS NOT NULL AND nik <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_recyclers_npwp_unique
  ON public.recyclers (npwp)
  WHERE npwp IS NOT NULL AND npwp <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_recyclers_nik_unique
  ON public.recyclers (nik)
  WHERE nik IS NOT NULL AND nik <> '';