-- ============================================================
-- ECOPLY.AI — Segmentasi perusahaan & identitas pajak fleksibel
--
-- Target segmen: perusahaan besar/menengah, UMKM, dan recycler.
--  - companies.segment : UMKM / menengah / besar
--  - companies.nik     : alternatif identitas jika tidak punya NPWP
--  - recyclers.{npwp,nik} : identitas pajak opsional
-- ============================================================

alter table public.companies
  add column if not exists segment text;

alter table public.companies
  add constraint companies_segment_check
  check (segment in ('umkm', 'menengah', 'besar'));

alter table public.companies
  add column if not exists nik text;

alter table public.recyclers
  add column if not exists npwp text;

alter table public.recyclers
  add column if not exists nik text;