-- FIX: ca_* review gagal — m66 memaksa WITH CHECK status = 'draft',
-- tetapi konfirmasi menulis status 'confirmed'/'rejected'.
--
-- Kebijakan yang benar:
--   USING  = status = 'draft'  (hanya draft yang bisa diupdate)
--   WITH CHECK = status IN ('draft','confirmed','rejected')
--
-- Setelah konfirmasi → USING tidak lagi match → baris terkunci dari
-- perubahan lebih lanjut (baik via UI maupun API client).

-- ca_combustion
DROP POLICY IF EXISTS "ca_combustion_update_own" ON public.ca_combustion;
CREATE POLICY "ca_combustion_update_own"
  ON public.ca_combustion
  FOR UPDATE
  USING  (company_id = public.get_company_id() AND status = 'draft')
  WITH CHECK (company_id = public.get_company_id() AND status IN ('draft','confirmed','rejected'));

-- ca_vehicle
DROP POLICY IF EXISTS "ca_vehicle_update_own" ON public.ca_vehicle;
CREATE POLICY "ca_vehicle_update_own"
  ON public.ca_vehicle
  FOR UPDATE
  USING  (company_id = public.get_company_id() AND status = 'draft')
  WITH CHECK (company_id = public.get_company_id() AND status IN ('draft','confirmed','rejected'));

-- ca_fugitive
DROP POLICY IF EXISTS "ca_fugitive_update_own" ON public.ca_fugitive;
CREATE POLICY "ca_fugitive_update_own"
  ON public.ca_fugitive
  FOR UPDATE
  USING  (company_id = public.get_company_id() AND status = 'draft')
  WITH CHECK (company_id = public.get_company_id() AND status IN ('draft','confirmed','rejected'));

-- ca_energy
DROP POLICY IF EXISTS "ca_energy_update_own" ON public.ca_energy;
CREATE POLICY "ca_energy_update_own"
  ON public.ca_energy
  FOR UPDATE
  USING  (company_id = public.get_company_id() AND status = 'draft')
  WITH CHECK (company_id = public.get_company_id() AND status IN ('draft','confirmed','rejected'));

-- ca_s3c1
DROP POLICY IF EXISTS "ca_s3c1_update_own" ON public.ca_s3c1;
CREATE POLICY "ca_s3c1_update_own"
  ON public.ca_s3c1
  FOR UPDATE
  USING  (company_id = public.get_company_id() AND status = 'draft')
  WITH CHECK (company_id = public.get_company_id() AND status IN ('draft','confirmed','rejected'));

-- ca_s3c2 (policy name uses spaces per original migration)
DROP POLICY IF EXISTS "ca_s3c2: company can update own" ON public.ca_s3c2;
CREATE POLICY "ca_s3c2: company can update own"
  ON public.ca_s3c2
  FOR UPDATE
  USING  (company_id = public.get_company_id() AND status = 'draft')
  WITH CHECK (company_id = public.get_company_id() AND status IN ('draft','confirmed','rejected'));