-- ============================================================
-- Add ef_snapshot column to ALL ca_* activity tables
-- Idempotent: safe to run multiple times (IF NOT EXISTS)
-- ============================================================
-- Purpose:
--   Stores emission factor snapshot + calculation formula at time
--   of entry creation. Includes extraction_meta when entry was
--   created via AI extraction/prompt input.
-- ============================================================

-- Scope 1: Stationary & Mobile Combustion
ALTER TABLE ca_combustion
  ADD COLUMN IF NOT EXISTS ef_snapshot jsonb;

COMMENT ON COLUMN ca_combustion.ef_snapshot IS
  'Snapshot of emission factors and formula at time of entry. '
  'Includes extraction_meta when created via AI extraction/prompt.';

-- Scope 1: Vehicle (distance-based)
ALTER TABLE ca_vehicle
  ADD COLUMN IF NOT EXISTS ef_snapshot jsonb;

COMMENT ON COLUMN ca_vehicle.ef_snapshot IS
  'Snapshot of emission factors and formula at time of entry. '
  'Includes extraction_meta when created via AI extraction/prompt.';

-- Scope 1: Fugitive
ALTER TABLE ca_fugitive
  ADD COLUMN IF NOT EXISTS ef_snapshot jsonb;

COMMENT ON COLUMN ca_fugitive.ef_snapshot IS
  'Snapshot of emission factors and formula at time of entry. '
  'Includes extraction_meta when created via AI extraction/prompt.';

-- Scope 2: Energy
ALTER TABLE ca_energy
  ADD COLUMN IF NOT EXISTS ef_snapshot jsonb;

COMMENT ON COLUMN ca_energy.ef_snapshot IS
  'Snapshot of emission factors and formula at time of entry. '
  'Includes extraction_meta when created via AI extraction/prompt.';

-- Scope 3 Cat 1
ALTER TABLE ca_s3c1
  ADD COLUMN IF NOT EXISTS ef_snapshot jsonb;

COMMENT ON COLUMN ca_s3c1.ef_snapshot IS
  'Snapshot of emission factors and formula at time of entry. '
  'Includes extraction_meta when created via AI extraction/prompt.';