-- ============================================================
-- ECOPLY.AI — Deterministic evidence ORDER (fix)
--
-- Migration 091 added a tiebreaker to search_company_document_chunks
-- using `chunk_id`. But `chunk_id` is a fresh UUID for every audit job:
-- the identical document is re-chunked and re-inserted on each submit,
-- so the tiebreaker value differs per job. Areas whose top chunks share
-- the same ts_rank_cd (e.g. 1.2/1.2, 2.2/2.2) therefore came back in a
-- different order (and, at the LIMIT boundary, a different SET) on every
-- job. That changed the audit signature → reuse never hit → verdicts
-- drifted between re-audits of the same file (e.g. 10 vs 11 compliant).
--
-- `chunk_index` is stable for the same document because extraction and
-- chunking are deterministic (verified: identical order-hash across
-- jobs). Tie-break on it so the same query on the same document always
-- returns the same rows in the same order, regardless of job UUIDs.
--
-- match_regulation_chunks already tie-breaks on rc.id, which is a
-- database-stable UUID shared across jobs — no change needed there.
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
  with ranked as (
    select
      cdc.id          as chunk_id,
      cdc.page_number,
      cdc.section_title,
      cdc.text_chunk,
      cdc.chunk_index,
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
      r.chunk_index,
      row_number() over (
        partition by
          case
            when r.page_number is not null then 'p' || r.page_number::text
            else 'c' || r.chunk_index::text
          end
        order by r.sim desc, r.chunk_index
      ) as rn
    from ranked r
  )
  select chunk_id, page_number, section_title, text_chunk, sim as similarity
  from per_page
  where rn = 1
  order by similarity desc, chunk_index
  limit match_count;
$$;

grant execute on function public.search_company_document_chunks(uuid, text, int) to service_role;
