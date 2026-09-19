-- ============================================
-- Cegah double-bid: max 1 bid aktif per (listing, recycler, initiator)
--
-- Masalah: recycler bisa mengirim bid berkali-kali untuk listing yang sama
-- (createMarketplaceBid tidak punya guard + tabel tidak punya contraint unik),
-- sehingga muncul banyak bid "pending" untuk pasangan listing/recycler yang sama.
--
-- Solusi:
--   1) Bersihkan duplikat aktif (pending/accepted) — sisakan yang paling baru.
--   2) Tambahkan partial unique index sehingga DB MENOLAK bid aktif kedua
--      untuk (listing_id, recycler_id, initiator) yang sama.
-- Index partial (tanpa kolom 'recycler' lain) menjamin race-condition sekalipun
-- tidak bisa menghasilkan double-bid, termasuk path request pickup (initiator='company').
-- ============================================

-- 1) Hapus duplikat aktif: pertahankan baris terbaru per (listing, recycler, initiator)
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY listing_id, recycler_id, initiator
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM public.marketplace_bids
  WHERE status IN ('pending', 'accepted')
)
DELETE FROM public.marketplace_bids mb
USING ranked r
WHERE mb.id = r.id AND r.rn > 1;

-- 2) Enforce di level database
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_bids_active_unique
  ON public.marketplace_bids (listing_id, recycler_id, initiator)
  WHERE status IN ('pending', 'accepted');