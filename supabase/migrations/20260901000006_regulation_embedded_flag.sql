-- ============================================================
-- Add is_embedded flag to regulations
-- Prevents re-embedding without explicit reset
-- ============================================================

alter table public.regulations
  add column if not exists is_embedded boolean not null default false,
  add column if not exists embedded_at  timestamptz,
  add column if not exists chunk_count  integer;

-- Backfill: mark regulations that already have chunks as embedded
update public.regulations r
set
  is_embedded = true,
  embedded_at  = now(),
  chunk_count  = (
    select count(*) from public.regulation_chunks rc
    where rc.regulation_id = r.id
  )
where exists (
  select 1 from public.regulation_chunks rc where rc.regulation_id = r.id
);
