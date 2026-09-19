-- ============================================
-- Fase 5: Fulfillment & Sertifikat
--
-- Menambahkan lapisan fulfillment di atas marketplace:
--   manifests           - manifest digital + QR saat pickup dikonfirmasi
--   pickup_records      - timbangan bersih + foto bukti dari recycler
--   certificates        - sertifikat recycling PDF (auto-generate)
--
-- Hal penting:
--   * SEMUA tulis (insert/update) dilakukan via RPC SECURITY DEFINER
--     (pola yang sama dengan migrasi 43 & 45), sehingga otorisasi
--     divalidasi DI DALAM fungsi, bukan lewat RLS.
--   * RLS pada tabel baru cukup untuk SELECT: pihak terkait (company
--     pemilik listing / recycler pemilik bid) dan admin.
--   * Storage policy pickup-evidence kini juga mengizinkan COMPANY
--     terkait membaca foto bukti (sebelumnya hanya recycler + admin).
--   * Storage policy certificates mengizinkan company pemilik listing
--     meng-upload PDF sertifikat (sebelumnya service role only).
-- ============================================

-- ------------------------------------------------------------
-- TABEL BARU
-- ------------------------------------------------------------

-- ============================
-- 1. manifests
-- ============================
CREATE TABLE IF NOT EXISTS public.manifests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.waste_listings(id) ON DELETE CASCADE,
  bid_id uuid NOT NULL REFERENCES public.marketplace_bids(id) ON DELETE CASCADE,
  manifest_no text NOT NULL UNIQUE,
  -- Payload QR (equiv. manifest_no). Ditampilkan sebagai QR di UI.
  qr_code text NOT NULL,
  status text NOT NULL DEFAULT 'issued'
    CONSTRAINT manifests_status_check
    CHECK (status IN ('issued', 'pickup_recorded', 'confirmed', 'certificate_issued')),
  -- Konfirmasi dua arah:
  --   recycler_confirmed_at diisi saat pickup dicatat (record_pickup)
  --   company_confirmed_at  diisi saat company menyetujui transaksi
  recycler_confirmed_at timestamptz,
  company_confirmed_at timestamptz,
  -- Kehadiran recycler di lokasi (QR dipindai) — wajib sebelum record_pickup
  attended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Satu manifest per bid yang diterima (idempotent guard)
CREATE UNIQUE INDEX IF NOT EXISTS manifests_one_per_bid
  ON public.manifests(bid_id);

CREATE INDEX IF NOT EXISTS idx_manifests_listing_id
  ON public.manifests(listing_id);

-- ============================
-- 2. pickup_records
-- ============================
CREATE TABLE IF NOT EXISTS public.pickup_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id uuid NOT NULL REFERENCES public.manifests(id) ON DELETE CASCADE,
  net_weight_kg numeric NOT NULL CONSTRAINT pickup_records_weight_positive CHECK (net_weight_kg > 0),
  -- Path storage di bucket 'pickup-evidence' (privat), format:
  --   {recycler_user_id}/{manifest_id}/{file}
  photo_evidence text[] NOT NULL DEFAULT '{}',
  recorded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Hanya satu pencatatan pickup per manifest
CREATE UNIQUE INDEX IF NOT EXISTS pickup_records_single_per_manifest
  ON public.pickup_records(manifest_id);

CREATE INDEX IF NOT EXISTS idx_pickup_records_manifest_id
  ON public.pickup_records(manifest_id);

-- ============================
-- 3. certificates
-- ============================
CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id uuid NOT NULL REFERENCES public.manifests(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  recycler_name text NOT NULL,
  material_type text NOT NULL,
  weight_kg numeric NOT NULL,
  -- Estimasi CO2e terhindar (kg CO2e) dihitung di RPC issue_certificate.
  co2e_avoided_kg numeric NOT NULL,
  pdf_url text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certificates_manifest_id
  ON public.certificates(manifest_id);

-- ------------------------------------------------------------
-- HELPER (SECURITY DEFINER): siapa saja pihak dari sebuah manifest
-- Dipakai di RLS SELECT dan di storage policies — aman dari
-- rekursi karena berjalan sebagai pemilik fungsi (bypass RLS).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.manifest_parties(p_manifest_id uuid)
RETURNS TABLE (
  company_user_id uuid,
  recycler_user_id uuid,
  company_id uuid,
  recycler_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.user_id AS company_user_id,
    r.user_id AS recycler_user_id,
    c.id AS company_id,
    r.id AS recycler_id
  FROM public.manifests m
  JOIN public.waste_listings wl ON wl.id = m.listing_id
  JOIN public.companies c ON c.id = wl.company_id
  JOIN public.marketplace_bids b ON b.id = m.bid_id
  JOIN public.recyclers r ON r.id = b.recycler_id
  WHERE m.id = p_manifest_id
$$;

-- ------------------------------------------------------------
-- RLS MANIFESTS
-- ------------------------------------------------------------
ALTER TABLE public.manifests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manifests: related parties can view"
  ON public.manifests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.manifest_parties(id) p
      WHERE auth.uid() IN (p.company_user_id, p.recycler_user_id)
    )
    OR public.is_admin()
  );

CREATE POLICY "manifests: admin can delete"
  ON public.manifests
  FOR DELETE
  USING (public.is_admin());

-- ------------------------------------------------------------
-- RLS PICKUP RECORDS
-- ------------------------------------------------------------
ALTER TABLE public.pickup_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pickup_records: related parties can view"
  ON public.pickup_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.manifest_parties(manifest_id) p
      WHERE auth.uid() IN (p.company_user_id, p.recycler_user_id)
    )
    OR public.is_admin()
  );

CREATE POLICY "pickup_records: admin can delete"
  ON public.pickup_records
  FOR DELETE
  USING (public.is_admin());

-- ------------------------------------------------------------
-- RLS CERTIFICATES
-- ------------------------------------------------------------
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certificates: related parties can view"
  ON public.certificates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.manifest_parties(manifest_id) p
      WHERE auth.uid() IN (p.company_user_id, p.recycler_user_id)
    )
    OR public.is_admin()
  );

CREATE POLICY "certificates: admin can delete"
  ON public.certificates
  FOR DELETE
  USING (public.is_admin());

-- ------------------------------------------------------------
-- STORAGE POLICIES (Fase 5)
-- ------------------------------------------------------------

-- pickup-evidence: COMPANY terkait kini bisa membaca foto bukti.
-- Path: {recycler_user_id}/{manifest_id}/{file}
CREATE POLICY "pickup-evidence: related party can read"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'pickup-evidence'
    AND (storage.foldername(name))[2] ~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND EXISTS (
      SELECT 1 FROM public.manifest_parties((storage.foldername(name))[2]::uuid) p
      WHERE auth.uid() IN (p.company_user_id, p.recycler_user_id)
    )
  );

-- NOTE: bucket 'certificates' tetap service-role only sesuai migrasi 01.
-- PDF sertifikat diupload via admin client pada server action
-- issue_certificate (lib/supabase/actions/marketplace.ts), jadi
-- TIDAK perlu policy INSERT di sini.

-- ------------------------------------------------------------
-- RPC 1: BUAT MANIFEST (dipanggil company saat confirm pickup)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_pickup_manifest(
  p_listing_id uuid,
  p_manifest_no text,
  p_qr_code text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_listing record;
  v_accepted_bid uuid;
  v_existing_manifest uuid;
  v_manifest record;
BEGIN
  IF p_manifest_no IS NULL OR length(p_manifest_no) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nomor manifest tidak valid');
  END IF;

  -- 1) Hanya company pemilik listing
  SELECT c.id INTO v_company_id
  FROM public.companies c
  WHERE c.user_id = auth.uid();

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Company profile not found');
  END IF;

  SELECT wl.id, wl.company_id, wl.status
  INTO v_listing
  FROM public.waste_listings wl
  WHERE wl.id = p_listing_id;

  IF v_listing.id IS NULL OR v_listing.company_id <> v_company_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Listing tidak ditemukan atau bukan milik Anda');
  END IF;
  IF v_listing.status NOT IN ('dealing', 'confirmed') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Manifest hanya dibuat saat pickup dikonfirmasi');
  END IF;

  SELECT mb.id INTO v_accepted_bid
  FROM public.marketplace_bids mb
  WHERE mb.listing_id = p_listing_id
    AND mb.status = 'accepted'
  ORDER BY mb.updated_at DESC
  LIMIT 1;

  IF v_accepted_bid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Belum ada bid yang diterima');
  END IF;

  -- 2) Idempotent: kembalikan manifest yang sudah ada
  SELECT m.id INTO v_existing_manifest
  FROM public.manifests m
  WHERE m.bid_id = v_accepted_bid;

  IF v_existing_manifest IS NOT NULL THEN
    SELECT * INTO v_manifest FROM public.manifests WHERE id = v_existing_manifest;
    RETURN jsonb_build_object('ok', true, 'manifest', row_to_json(v_manifest)::jsonb);
  END IF;

  -- 3) Buat manifest baru
  INSERT INTO public.manifests (listing_id, bid_id, manifest_no, qr_code)
  VALUES (p_listing_id, v_accepted_bid, p_manifest_no, p_qr_code)
  RETURNING * INTO v_manifest;

  RETURN jsonb_build_object('ok', true, 'manifest', row_to_json(v_manifest)::jsonb);
END;
$$;

-- ------------------------------------------------------------
-- RPC 2: CATAT PICKUP (dipanggil RECYCLER pemilik bid)
-- Menyimpan berat bersih + foto bukti, lalu menandai manifest
-- sebagai 'pickup_recorded'.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_pickup(
  p_manifest_id uuid,
  p_net_weight_kg numeric,
  p_photos text[]
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recycler_id uuid;
  v_manifest record;
  v_record_id uuid;
BEGIN
  -- 1) Hanya recycler terdaftar
  SELECT r.id INTO v_recycler_id
  FROM public.recyclers r
  WHERE r.user_id = auth.uid();

  IF v_recycler_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Recycler profile not found');
  END IF;

  -- 2) Manifest harus ada
  SELECT * INTO v_manifest
  FROM public.manifests
  WHERE id = p_manifest_id;

  IF v_manifest.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Manifest tidak ditemukan');
  END IF;

  -- 3) Recycler harus pemilik bid pada listing manifest
  IF NOT EXISTS (
    SELECT 1 FROM public.marketplace_bids mb
    WHERE mb.id = v_manifest.bid_id
      AND mb.recycler_id = v_recycler_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  -- 4) Gate: kehadiran harus tercatat dulu (QR dipindai di lokasi)
  IF v_manifest.attended_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Kehadiran di lokasi belum tercatat. Pindai QR yang ditampilkan perusahaan di lokasi pickup.');
  END IF;

  -- 5) Hanya bisa dicatat sekali, saat status masih 'issued'
  IF v_manifest.status <> 'issued' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pickup sudah dicatat sebelumnya');
  END IF;

  IF p_net_weight_kg IS NULL OR p_net_weight_kg <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Berat bersih harus lebih dari 0');
  END IF;

  INSERT INTO public.pickup_records (manifest_id, net_weight_kg, photo_evidence, recorded_by)
  VALUES (p_manifest_id, p_net_weight_kg, COALESCE(p_photos, '{}'::text[]), auth.uid())
  RETURNING id INTO v_record_id;

  UPDATE public.manifests
  SET status = 'pickup_recorded',
      recycler_confirmed_at = now(),
      updated_at = now()
  WHERE id = p_manifest_id;

  RETURN jsonb_build_object('ok', true, 'record_id', v_record_id);
END;
$$;

-- ------------------------------------------------------------
-- RPC 3: KONFIRMASI TRANSAKSI (dipanggil COMPANY pemilik listing)
-- Menyetujui setelah data pickup masuk. Menandai listing Selesai.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.company_confirm_pickup(p_manifest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_manifest record;
BEGIN
  SELECT c.id INTO v_company_id
  FROM public.companies c
  WHERE c.user_id = auth.uid();

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Company profile not found');
  END IF;

  SELECT * INTO v_manifest
  FROM public.manifests
  WHERE id = p_manifest_id;

  IF v_manifest.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Manifest tidak ditemukan');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.waste_listings wl
    WHERE wl.id = v_manifest.listing_id
      AND wl.company_id = v_company_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  -- Konfirmasi hanya setelah recycler mencatat pickup
  IF v_manifest.status <> 'pickup_recorded' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Belum ada catatan pickup dari recycler');
  END IF;

  UPDATE public.manifests
  SET status = 'confirmed',
      company_confirmed_at = now(),
      updated_at = now()
  WHERE id = p_manifest_id;

  -- Listing otomatis Selesai
  UPDATE public.waste_listings
  SET status = 'completed', updated_at = now()
  WHERE id = v_manifest.listing_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ------------------------------------------------------------
-- RPC 4: TERBITKAN SERTIFIKAT (dipanggil COMPANY pemilik listing)
-- Data diambil dari DB (bukan dari client): berat bersih pickup_records,
-- nama company/recycler, material — co2e dihitung dari faktor tetap.
-- Client hanya mengirim URL PDF hasil generate.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_certificate(
  p_manifest_id uuid,
  p_pdf_url text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_manifest record;
  v_listing record;
  v_bid record;
  v_company record;
  v_recycler record;
  v_pickup record;
  v_weight numeric;
  v_co2e numeric;
  v_certificate_id uuid;
  v_certificate record;
BEGIN
  SELECT c.id INTO v_company_id
  FROM public.companies c
  WHERE c.user_id = auth.uid();

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Company profile not found');
  END IF;

  IF p_pdf_url IS NULL OR length(p_pdf_url) < 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'URL sertifikat tidak valid');
  END IF;

  SELECT * INTO v_manifest FROM public.manifests WHERE id = p_manifest_id;
  IF v_manifest.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Manifest tidak ditemukan');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.waste_listings wl
    WHERE wl.id = v_manifest.listing_id
      AND wl.company_id = v_company_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  -- Sertifikat diterbitkan dari status 'confirmed'
  IF v_manifest.status NOT IN ('confirmed', 'certificate_issued') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Transaction belum dikonfirmasi');
  END IF;

  SELECT wl.* INTO v_listing FROM public.waste_listings wl WHERE wl.id = v_manifest.listing_id;
  SELECT mb.* INTO v_bid FROM public.marketplace_bids mb WHERE mb.id = v_manifest.bid_id;
  SELECT c.* INTO v_company FROM public.companies c WHERE c.id = v_listing.company_id;
  SELECT r.* INTO v_recycler FROM public.recyclers r WHERE r.id = v_bid.recycler_id;

  SELECT pr.* INTO v_pickup FROM public.pickup_records pr WHERE pr.manifest_id = p_manifest_id;

  IF v_pickup.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Data pickup belum tersedia');
  END IF;

  v_weight := v_pickup.net_weight_kg;
  -- Faktor estimasi CO2e terhindar (kg CO2e / kg material didaur ulang).
  -- Nilai placeholder; dihubungkan ke perhitungan carbon intern di fase berikutnya.
  v_co2e := round(v_weight * 0.3, 2);

  -- Idempotent: jika sudah terbit, kembalikan yang ada
  SELECT c.id INTO v_certificate_id
  FROM public.certificates c
  WHERE c.manifest_id = p_manifest_id
  ORDER BY c.issued_at DESC
  LIMIT 1;

  IF v_certificate_id IS NOT NULL THEN
    SELECT * INTO v_certificate FROM public.certificates WHERE id = v_certificate_id;
    RETURN jsonb_build_object('ok', true, 'certificate', row_to_json(v_certificate)::jsonb);
  END IF;

  INSERT INTO public.certificates (
    manifest_id, company_name, recycler_name, material_type,
    weight_kg, co2e_avoided_kg, pdf_url
  ) VALUES (
    p_manifest_id,
    COALESCE(v_company.name, 'Perusahaan'),
    COALESCE(v_recycler.name, 'Recycler'),
    v_listing.material_type,
    v_weight,
    v_co2e,
    p_pdf_url
  )
  RETURNING id INTO v_certificate_id;

  SELECT * INTO v_certificate FROM public.certificates WHERE id = v_certificate_id;

  UPDATE public.manifests
  SET status = 'certificate_issued', updated_at = now()
  WHERE id = p_manifest_id;

  RETURN jsonb_build_object('ok', true, 'certificate', row_to_json(v_certificate)::jsonb);
END;
$$;

-- ------------------------------------------------------------
-- GRANT
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.create_pickup_manifest(uuid, text, text) FROM public;
REVOKE ALL ON FUNCTION public.record_pickup(uuid, numeric, text[]) FROM public;
REVOKE ALL ON FUNCTION public.company_confirm_pickup(uuid) FROM public;
REVOKE ALL ON FUNCTION public.issue_certificate(uuid, text) FROM public;

GRANT EXECUTE ON FUNCTION public.create_pickup_manifest(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_pickup(uuid, numeric, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_confirm_pickup(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_certificate(uuid, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.manifest_parties(uuid) TO authenticated;

-- GRANT SELECT pada tabel baru ke authenticated juga (RLS tetap membatasi baris)
GRANT SELECT ON public.manifests TO authenticated;
GRANT SELECT ON public.pickup_records TO authenticated;
GRANT SELECT ON public.certificates TO authenticated;