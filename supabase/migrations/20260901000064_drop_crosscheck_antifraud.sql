-- ============================================================
-- ECOPLY.AI — Hapus seluruh fitur Anti-Fraud / Greenwashing /
-- Crosscheck Flags (keputusan pengguna: drop total).
--
-- Menghapus:
--   1. Tabel crosscheck_flags + semua policy RLS/index/constraint
--   2. Fungsi detect_crosscheck_flags()
--   3. Enum crosscheck_flag_type & crosscheck_severity
-- ============================================================

drop table if exists public.crosscheck_flags cascade;

drop function if exists public.detect_crosscheck_flags();

drop type if exists public.crosscheck_flag_type;
drop type if exists public.crosscheck_severity;