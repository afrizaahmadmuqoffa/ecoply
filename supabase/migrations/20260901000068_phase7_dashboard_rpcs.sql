-- ============================================================
-- FASE 7 — Dashboard Snapshot RPCs + Admin email lookup
-- Satu round-trip per dashboard (menggantikan ~29 query count).
-- Semua SECURITY DEFINER dengan guard role/pemilikan internal.
-- ============================================================

-- ── ADMIN: snapshot seluruh platform ───────────────────────
CREATE OR REPLACE FUNCTION public.admin_dashboard_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT jsonb_build_object(
    'ok', true,
    'companies_total',    (SELECT count(*) FROM public.companies),
    'companies_verified', (SELECT count(*) FROM public.companies WHERE verification_status = 'verified'),
    'recyclers_total',    (SELECT count(*) FROM public.recyclers),
    'recyclers_verified', (SELECT count(*) FROM public.recyclers WHERE verification_status = 'verified'),
    'vr_pending',         (SELECT count(*) FROM public.verification_requests WHERE status = 'pending'),
    'vr_rejected',        (SELECT count(*) FROM public.verification_requests WHERE status = 'rejected'),
    'regulations_active', (SELECT count(*) FROM public.regulations WHERE status = 'active'),
    'listings_total',     (SELECT count(*) FROM public.waste_listings),
    'listings_open',      (SELECT count(*) FROM public.waste_listings WHERE status = 'open'),
    'listings_completed', (SELECT count(*) FROM public.waste_listings WHERE status = 'completed'),
    'bids_pending',       (SELECT count(*) FROM public.marketplace_bids WHERE status = 'pending'),
    'bids_accepted',      (SELECT count(*) FROM public.marketplace_bids WHERE status = 'accepted'),
    'threads',            (SELECT count(*) FROM public.chat_threads),
    'messages',           (SELECT count(*) FROM public.chat_messages),
    'manifests_total',    (SELECT count(*) FROM public.manifests),
    'manifests_cert',     (SELECT count(*) FROM public.manifests WHERE status = 'certificate_issued'),
    'certificates',       (SELECT count(*) FROM public.certificates),
    'co2e_avoided_kg',    (SELECT COALESCE(sum(co2e_avoided_kg), 0) FROM public.certificates),
    'weight_recycled_kg', (SELECT COALESCE(sum(weight_kg), 0) FROM public.certificates),
    'audits_done',        (SELECT count(*) FROM public.audit_jobs WHERE status = 'done'),
    'audits_inflight',    (SELECT count(*) FROM public.audit_jobs WHERE status IN ('queued', 'processing')),
    'carbon_confirmed', (
      (SELECT count(*) FROM public.ca_combustion WHERE status = 'confirmed') +
      (SELECT count(*) FROM public.ca_vehicle    WHERE status = 'confirmed') +
      (SELECT count(*) FROM public.ca_fugitive   WHERE status = 'confirmed') +
      (SELECT count(*) FROM public.ca_energy     WHERE status = 'confirmed') +
      (SELECT count(*) FROM public.ca_s3c1       WHERE status = 'confirmed') +
      (SELECT count(*) FROM public.ca_s3c2       WHERE status = 'confirmed')
    ),
    'carbon_rejected', (
      (SELECT count(*) FROM public.ca_combustion WHERE status = 'rejected') +
      (SELECT count(*) FROM public.ca_vehicle    WHERE status = 'rejected') +
      (SELECT count(*) FROM public.ca_fugitive   WHERE status = 'rejected') +
      (SELECT count(*) FROM public.ca_energy     WHERE status = 'rejected') +
      (SELECT count(*) FROM public.ca_s3c1       WHERE status = 'rejected') +
      (SELECT count(*) FROM public.ca_s3c2       WHERE status = 'rejected')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ── COMPANY: snapshot dashboard company ────────────────────
CREATE OR REPLACE FUNCTION public.company_dashboard_snapshot(p_company uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Hanya perusahaan milik caller yang boleh diambil
  IF NOT EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = p_company AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT jsonb_build_object(
    'ok', true,
    'audits_total',  (SELECT count(*) FROM public.audit_jobs WHERE company_id = p_company),
    'audits_done',   (SELECT count(*) FROM public.audit_jobs WHERE company_id = p_company AND status = 'done'),
    'audits_failed', (SELECT count(*) FROM public.audit_jobs WHERE company_id = p_company AND status = 'failed'),
    'carbon_confirmed', (
      (SELECT count(*) FROM public.ca_combustion WHERE company_id = p_company AND status = 'confirmed') +
      (SELECT count(*) FROM public.ca_vehicle    WHERE company_id = p_company AND status = 'confirmed') +
      (SELECT count(*) FROM public.ca_fugitive   WHERE company_id = p_company AND status = 'confirmed') +
      (SELECT count(*) FROM public.ca_energy     WHERE company_id = p_company AND status = 'confirmed') +
      (SELECT count(*) FROM public.ca_s3c1       WHERE company_id = p_company AND status = 'confirmed') +
      (SELECT count(*) FROM public.ca_s3c2       WHERE company_id = p_company AND status = 'confirmed')
    ),
    'carbon_drafts', (
      (SELECT count(*) FROM public.ca_combustion WHERE company_id = p_company AND status = 'draft') +
      (SELECT count(*) FROM public.ca_vehicle    WHERE company_id = p_company AND status = 'draft') +
      (SELECT count(*) FROM public.ca_fugitive   WHERE company_id = p_company AND status = 'draft') +
      (SELECT count(*) FROM public.ca_energy     WHERE company_id = p_company AND status = 'draft') +
      (SELECT count(*) FROM public.ca_s3c1       WHERE company_id = p_company AND status = 'draft') +
      (SELECT count(*) FROM public.ca_s3c2       WHERE company_id = p_company AND status = 'draft')
    ),
    'listings_total',     (SELECT count(*) FROM public.waste_listings WHERE company_id = p_company),
    'listings_open',      (SELECT count(*) FROM public.waste_listings WHERE company_id = p_company AND status = 'open'),
    'listings_completed', (SELECT count(*) FROM public.waste_listings WHERE company_id = p_company AND status = 'completed'),
    'bids_pending', (SELECT count(*) FROM public.marketplace_bids b
                     WHERE b.listing_id IN (SELECT id FROM public.waste_listings WHERE company_id = p_company)
                       AND b.status = 'pending'),
    'bids_accepted', (SELECT count(*) FROM public.marketplace_bids b
                      WHERE b.listing_id IN (SELECT id FROM public.waste_listings WHERE company_id = p_company)
                        AND b.status = 'accepted'),
    'threads', (SELECT count(*) FROM public.chat_threads WHERE company_id = p_company),
    'manifests', (SELECT count(*) FROM public.manifests m
                  WHERE m.listing_id IN (SELECT id FROM public.waste_listings WHERE company_id = p_company)),
    'certificates', (SELECT count(*) FROM public.certificates c
                     WHERE c.manifest_id IN (
                       SELECT id FROM public.manifests
                       WHERE listing_id IN (SELECT id FROM public.waste_listings WHERE company_id = p_company)
                     )),
    'co2e_avoided_kg', (SELECT COALESCE(sum(c.co2e_avoided_kg), 0) FROM public.certificates c
                        WHERE c.manifest_id IN (
                          SELECT id FROM public.manifests
                          WHERE listing_id IN (SELECT id FROM public.waste_listings WHERE company_id = p_company)
                        )),
    'weight_recycled_kg', (SELECT COALESCE(sum(c.weight_kg), 0) FROM public.certificates c
                           WHERE c.manifest_id IN (
                             SELECT id FROM public.manifests
                             WHERE listing_id IN (SELECT id FROM public.waste_listings WHERE company_id = p_company)
                           ))
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ── RECYCLER: snapshot dashboard recycler ──────────────────
CREATE OR REPLACE FUNCTION public.recycler_dashboard_snapshot(p_recycler uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.recyclers
    WHERE id = p_recycler AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT jsonb_build_object(
    'ok', true,
    'bids_total',    (SELECT count(*) FROM public.marketplace_bids WHERE recycler_id = p_recycler),
    'bids_pending',  (SELECT count(*) FROM public.marketplace_bids WHERE recycler_id = p_recycler AND status = 'pending'),
    'bids_accepted', (SELECT count(*) FROM public.marketplace_bids WHERE recycler_id = p_recycler AND status = 'accepted'),
    'bids_declined', (SELECT count(*) FROM public.marketplace_bids WHERE recycler_id = p_recycler AND status = 'rejected'),
    'manifests', (SELECT count(*) FROM public.manifests m
                  WHERE m.bid_id IN (SELECT id FROM public.marketplace_bids WHERE recycler_id = p_recycler)),
    'certificates', (SELECT count(*) FROM public.certificates c
                     WHERE c.manifest_id IN (
                       SELECT id FROM public.manifests
                       WHERE bid_id IN (SELECT id FROM public.marketplace_bids WHERE recycler_id = p_recycler)
                     )),
    'co2e_avoided_kg', (SELECT COALESCE(sum(c.co2e_avoided_kg), 0) FROM public.certificates c
                        WHERE c.manifest_id IN (
                          SELECT id FROM public.manifests
                          WHERE bid_id IN (SELECT id FROM public.marketplace_bids WHERE recycler_id = p_recycler)
                        )),
    'weight_recycled_kg', (SELECT COALESCE(sum(c.weight_kg), 0) FROM public.certificates c
                           WHERE c.manifest_id IN (
                             SELECT id FROM public.manifests
                             WHERE bid_id IN (SELECT id FROM public.marketplace_bids WHERE recycler_id = p_recycler)
                           )),
    'threads', (SELECT count(*) FROM public.chat_threads WHERE recycler_id = p_recycler)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ── ADMIN: ambil email user (auth.users tidak ter-expose) ──
CREATE OR REPLACE FUNCTION public.admin_get_user_email(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN NULL;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  RETURN v_email;
END;
$$;

-- ── GRANT ──────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.admin_dashboard_snapshot() FROM public;
REVOKE ALL ON FUNCTION public.company_dashboard_snapshot(uuid) FROM public;
REVOKE ALL ON FUNCTION public.recycler_dashboard_snapshot(uuid) FROM public;
REVOKE ALL ON FUNCTION public.admin_get_user_email(uuid) FROM public;

GRANT EXECUTE ON FUNCTION public.admin_dashboard_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_dashboard_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recycler_dashboard_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_email(uuid) TO authenticated;