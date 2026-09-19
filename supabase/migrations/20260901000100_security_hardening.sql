-- ============================================================
-- FASE 8 — Security Hardening (RLS & Trigger)
--
-- Menutup temuan audit:
--   K-1 (kritikal): self-elevation role='admin' & cross-tenant
--                   reassign company_id/recycler_id di `profiles`
--   K-2 (kritikal): PII recycler (npwp/nik/nib/alamat) terbaca
--                   semua akun company lewat base table
--   K-3 (kritikal): self-set verification_status='verified'
--   T-A4 (tinggi):  recycler self-accept bid sendiri via direct
--                   UPDATE PostgREST (state machine rusak)
--
-- Strategy: kolom sensitif dikunci lewat trigger (RLS tidak bisa
-- membatasi per-kolom). Akses sah tetap berjalan:
--   - onboarding (INSERT profiles via sesi pemilik)
--   - edit profil pemilik (UPDATE full_name / field entity)
--   - applyVerification (service_role, bypass RLS)
--   - reset_verification_to_pending (SECURITY DEFINER + GUC flag)
-- ============================================================

-- ============================================================
-- 0) Helper konteks berprivilege untuk trigger
--    (SECURITY INVOKER — `current_user` harus milik sesi pemanggil)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_privileged_rls_context()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    current_user = 'service_role'
    OR public.is_admin()
    OR coalesce(current_setting('app.security_overrides', true), '') = '1';
$$;

-- ============================================================
-- 1) profiles: kunci role / company_id / recycler_id /
--    verification_status (K-1, P2, K-3)
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_profiles_column_guards()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_privileged_rls_context() THEN
      IF NEW.role NOT IN ('company', 'recycler') THEN
        RAISE EXCEPTION 'profiles: role hanya boleh company/recycler saat pendaftaran';
      END IF;

      IF NEW.verification_status IS DISTINCT FROM 'pending' THEN
        RAISE EXCEPTION 'profiles: verification_status di-set saat pendaftaran';
      END IF;

      IF NEW.role = 'company' THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.companies c
          WHERE c.id = NEW.company_id AND c.user_id = auth.uid()
        ) THEN
          RAISE EXCEPTION 'profiles: company_id bukan milik anda';
        END IF;
      ELSIF NEW.role = 'recycler' THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.recyclers r
          WHERE r.id = NEW.recycler_id AND r.user_id = auth.uid()
        ) THEN
          RAISE EXCEPTION 'profiles: recycler_id bukan milik anda';
        END IF;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: identitas profil tidak boleh berpindah/berubah siapa pun
  -- kecuali konteks berprivilege.
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.recycler_id IS DISTINCT FROM OLD.recycler_id THEN
    IF NOT public.is_privileged_rls_context() THEN
      RAISE EXCEPTION 'profiles: role/company_id/recycler_id tidak dapat diubah';
    END IF;
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NOT public.is_privileged_rls_context() THEN
      RAISE EXCEPTION 'profiles: verification_status hanya dapat diubah admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_column_guards ON public.profiles;
CREATE TRIGGER profiles_column_guards
  BEFORE INSERT OR UPDATE OF role, company_id, recycler_id, verification_status
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profiles_column_guards();

-- ============================================================
-- 2) companies/recyclers: kunci verification_status (K-3)
--    INSERT wajib 'pending'; perubahan hanya dari konteks privileged
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_verification_status_tamper()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.verification_status IS DISTINCT FROM 'pending'
       AND NOT public.is_privileged_rls_context() THEN
      RAISE EXCEPTION 'verification_status harus pending saat dibuat';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NOT public.is_privileged_rls_context() THEN
      RAISE EXCEPTION 'verification_status hanya dapat diubah admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_verification_guard ON public.companies;
CREATE TRIGGER companies_verification_guard
  BEFORE INSERT OR UPDATE OF verification_status
  ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_verification_status_tamper();

DROP TRIGGER IF EXISTS recyclers_verification_guard ON public.recyclers;
CREATE TRIGGER recyclers_verification_guard
  BEFORE INSERT OR UPDATE OF verification_status
  ON public.recyclers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_verification_status_tamper();

-- ============================================================
-- 3) reset_verification_to_pending: tandai konteks agar trigger
--    mengizinkan self-reopen (masih tervalidasi ownership di dalam
--    fungsi — m66)
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_verification_to_pending(
  p_entity_type text,
  p_entity_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM set_config('app.security_overrides', '1', true);

  IF p_entity_type = 'company' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = p_entity_id AND user_id = auth.uid()
    ) THEN
      RETURN false;
    END IF;
    UPDATE public.companies
    SET verification_status = 'pending', updated_at = now()
    WHERE id = p_entity_id;
    UPDATE public.profiles
    SET verification_status = 'pending', updated_at = now()
    WHERE company_id = p_entity_id;
  ELSIF p_entity_type = 'recycler' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.recyclers
      WHERE id = p_entity_id AND user_id = auth.uid()
    ) THEN
      RETURN false;
    END IF;
    UPDATE public.recyclers
    SET verification_status = 'pending', updated_at = now()
    WHERE id = p_entity_id;
    UPDATE public.profiles
    SET verification_status = 'pending', updated_at = now()
    WHERE recycler_id = p_entity_id;
  ELSE
    RETURN false;
  END IF;

  UPDATE public.verification_requests
  SET status = 'pending', reviewed_by = null, reviewed_at = null, note = null
  WHERE entity_type = p_entity_type::public.entity_type
    AND entity_id = p_entity_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_verification_to_pending(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.reset_verification_to_pending(text, uuid) TO authenticated;

-- ============================================================
-- 4) K-2: tutup kebocoran PII recycler ke akun company.
--    Akses resmi company tetap lewat view_recycler_public (verified,
--    PII diredaksi) dan RPC get_recyclers_within_radius (kolom aman).
-- ============================================================
DROP POLICY IF EXISTS "Companies can view active recyclers" ON public.recyclers;
DROP POLICY IF EXISTS "Companies can view recycler details" ON public.recycler_details;

-- ============================================================
-- 5) Hygiene: policy admin update profiles kini WITH CHECK
--    (m00 hanya USING is_admin, tanpa WITH CHECK)
-- ============================================================
DROP POLICY IF EXISTS "profiles: admin can update" ON public.profiles;
CREATE POLICY "profiles: admin can update"
  ON public.profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 6) Bucket sertifikat: batasi ukuran (≤5 MB) & MIME (PDF saja)
--    (bucket tetap public — URL di-embed di view publik & UI)
-- ============================================================
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = array['application/pdf']
WHERE id IN ('recycler-certs', 'company-certs');

-- ============================================================
-- 7) T-A4: state machine marketplace_bids
--    a) Recycler hanya bisa menarik bid sendiri (pending -> cancelled)
--    b) Recycler hanya bisa menjawab request company
--       (pending -> accepted/rejected) — sejalan RPC m45
--    Transisi lain via RPC SECURITY DEFINER (acceptBid/rejectBid/
--    recycler_respond_company_request) yang bypass RLS.
-- ============================================================

-- 7a) Recycler mengubah bid sendiri
DROP POLICY IF EXISTS "Recyclers can update their own bids" ON public.marketplace_bids;
CREATE POLICY "Recyclers can update their own bids"
  ON public.marketplace_bids
  FOR UPDATE
  USING (public.user_is_bid_owner(id) AND status = 'pending')
  WITH CHECK (public.user_is_bid_owner(id) AND status = 'cancelled');

-- 7b) Recycler menjawab request dari company
DROP POLICY IF EXISTS "Recyclers can update bids targeting them" ON public.marketplace_bids;
CREATE POLICY "Recyclers can update bids targeting them"
  ON public.marketplace_bids
  FOR UPDATE
  USING (
    public.user_is_bid_owner(id)
    AND initiator = 'company'
    AND status = 'pending'
  )
  WITH CHECK (
    public.user_is_bid_owner(id)
    AND initiator = 'company'
    AND status IN ('accepted', 'rejected')
  );

-- ============================================================
-- 8) certificates: satu manifest = satu sertifikat.
--    Dedupe data lama lalu kunci dengan UNIQUE(manifest_id).
-- ============================================================
DELETE FROM public.certificates
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY manifest_id ORDER BY id) AS rn
    FROM public.certificates
  ) t
  WHERE t.rn > 1
);

DROP INDEX IF EXISTS public.idx_certificates_manifest_id;
CREATE UNIQUE INDEX idx_certificates_manifest_id
  ON public.certificates(manifest_id);