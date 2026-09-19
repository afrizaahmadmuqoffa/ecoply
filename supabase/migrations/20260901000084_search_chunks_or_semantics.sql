-- ============================================================
-- ECOPLY.AI — Phase 2c bugfix: OR semantics for evidence search
--
-- `websearch_to_tsquery` IGNORES pipe punctuation (`|`) and treats
-- unquoted words as AND. Our 12 area queries (`token1 | token2 | ...`)
-- were therefore parsed as `token1 & token2 & ...`, requiring EVERY
-- keyword to appear in a single chunk — near-impossible → 10/12 areas
-- got zero evidence (all "not_assessed").
--
-- Fix: build the query with `to_tsquery` (which understands `|`).
-- Same signature → drop-in replace; grants survive `create or replace`.
-- ============================================================

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
  select
    cdc.id          as chunk_id,
    cdc.page_number,
    cdc.section_title,
    cdc.text_chunk,
    ts_rank(cdc.search_tsv, s.q) as similarity
  from public.company_document_chunks cdc,
       (select to_tsquery('simple', search_query) as q) s
  where cdc.job_id = p_job_id
    and s.q is not null
    and cdc.search_tsv @@ s.q
  order by similarity desc
  limit match_count;
$$;