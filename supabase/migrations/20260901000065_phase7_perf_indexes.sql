-- ============================================================
-- FASE 7 — Performance Indexes
-- Menambahkan index pada kolom FK & filter yang paling sering
-- dipakai di query, plus penambahan GIST PostGIS dan konversi
-- index embedding ke HNSW (lebih stabil & cepat saat dataset besar).
-- ============================================================

-- ── Chat (high-traffic) ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created
  ON public.chat_messages(thread_id, created_at DESC);

-- ── Marketplace ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_waste_listings_company_status
  ON public.waste_listings(company_id, status);

CREATE INDEX IF NOT EXISTS idx_waste_listings_status
  ON public.waste_listings(status);

CREATE INDEX IF NOT EXISTS idx_bids_listing_status
  ON public.marketplace_bids(listing_id, status);

CREATE INDEX IF NOT EXISTS idx_bids_recycler_status
  ON public.marketplace_bids(recycler_id, status);

-- ── Fulfillment ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_certificates_issued_at
  ON public.certificates(issued_at DESC);

-- Drop index duplikat: unique(bid_id) sudah menutupi kebutuhan.
DROP INDEX IF EXISTS public.idx_pickup_records_manifest_id;

-- ── Carbon activity: query window per periode ──────────────
CREATE INDEX IF NOT EXISTS ca_comb_company_period_idx  ON public.ca_combustion(company_id, period_start);
CREATE INDEX IF NOT EXISTS ca_vehicle_company_period_idx ON public.ca_vehicle(company_id, period_start);
CREATE INDEX IF NOT EXISTS ca_fugitive_company_period_idx ON public.ca_fugitive(company_id, period_start);
CREATE INDEX IF NOT EXISTS ca_energy_company_period_idx ON public.ca_energy(company_id, period_start);
CREATE INDEX IF NOT EXISTS ca_s3c1_company_period_idx ON public.ca_s3c1(company_id, period_start);
CREATE INDEX IF NOT EXISTS ca_s3c2_company_period_idx ON public.ca_s3c2(company_id, period_start);

-- ── PostGIS: pencarian radius ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_waste_listings_location_gist
  ON public.waste_listings USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_recycler_details_location_gist
  ON public.recycler_details USING GIST (location);

-- ── Embedding: IVFFlat → HNSW ──────────────────────────────
-- HNSW lebih akurat pada dataset besar & tidak butuh tuning
-- ulang saat data bertambah (IVFFlat butuh rebuild pada lists).
DROP INDEX IF EXISTS public.regulation_chunks_embedding_idx;

CREATE INDEX regulation_chunks_embedding_idx
  ON public.regulation_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Drop index duplikat yang sudah ditutupi unique constraint:
--   - regulation_chunks(regulation_id, chunk_index) unique
--   - audit_reports.job_id unique
DROP INDEX IF EXISTS public.regulation_chunks_regulation_idx;
DROP INDEX IF EXISTS public.ar_job_idx;