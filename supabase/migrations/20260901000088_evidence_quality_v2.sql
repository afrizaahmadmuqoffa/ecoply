-- ============================================================
-- ECOPLY.AI — Evidence quality v2
--
-- Low-quality / wrong evidence was hurting audit accuracy:
--  * FTS often returned TOC/index pages (hlm 4/76/329/320) as top
--    "evidence" because ts_rank rewards dense keyword frequency, not
--    substance. The AI then based conclusions on navigation pages.
--  * Rank scores were noisy/unnormalized (0.03–0.08), indistinguishable
--    from garbage matches.
--
-- This migration (unlike the reverted 086 experiment) does NOT change
-- search terms or heading weights — it only:
--  1. Adds `company_document_chunks.is_metadata` so the server can flag
--     navigation/TOC/index chunks at insert time,
--  2. Rewrites search_company_document_chunks to rank with ts_rank_cd
--     (cover-density), skip is_metadata chunks, and enforce one chunk
--     per page (diversity) so results span substantive pages.
-- ============================================================

-- ── 1. is_metadata column ─────────────────────────────────
alter table public.company_document_chunks
  add column if not exists is_metadata boolean not null default false;

create index if not exists company_document_chunks_is_metadata_idx
  on public.company_document_chunks (job_id) where is_metadata;

-- ── 2. Improved evidence search RPC ───────────────────────
-- Same signature as before → drop-in replace; grants survive `create or replace`.
create or replace function public.search_company_document_chunks(
  p_job_id     uuid,
  search_query text,
  match_count  int default 6
)
returns table (
  chunk_id      uuid,
  page_number   integer,
  section_title text,
  text_chunk    text,
  similarity    double precision
)
language sql stable
set search_path = public
as $$
  with ranked as (
    select
      cdc.id          as chunk_id,
      cdc.page_number,
      cdc.section_title,
      cdc.text_chunk,
      ts_rank_cd(cdc.search_tsv, s.q) as sim
    from public.company_document_chunks cdc,
         (select to_tsquery('simple', search_query) as q) s
    where cdc.job_id = p_job_id
      and s.q is not null
      and cdc.search_tsv @@ s.q
      and not cdc.is_metadata
  ),
  per_page as (
    select
      r.chunk_id,
      r.page_number,
      r.section_title,
      r.text_chunk,
      r.sim,
      row_number() over (
        partition by
          case
            when r.page_number is not null then 'p' || r.page_number::text
            else r.chunk_id::text
          end
        order by r.sim desc, r.chunk_id
      ) as rn
    from ranked r
  )
  select chunk_id, page_number, section_title, text_chunk, sim as similarity
  from per_page
  where rn = 1
  order by similarity desc
  limit match_count;
$$;

grant execute on function public.search_company_document_chunks(uuid, text, int) to service_role;