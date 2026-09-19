-- ============================================
-- Fitur Schedule Pickup
-- Kolom jadwal pickup pada acceptance bid (marketplace_bids).
-- Diisi saat company mengonfirmasi pickup (status listing 'dealing' -> 'confirmed').
-- IDEMPOTENT: aman dijalankan ulang.
-- ============================================
ALTER TABLE public.marketplace_bids
  ADD COLUMN IF NOT EXISTS pickup_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_address text,
  ADD COLUMN IF NOT EXISTS pickup_note text;