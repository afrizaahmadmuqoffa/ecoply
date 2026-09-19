-- ============================================================
-- ECOPLY.AI — Deterministic RAG retrieval
--
-- The two evidence retrieval RPCs ORDER BY a float score only. When
-- scores are identical (or the IVFFlat approximate index binds), the
-- database may return a different row order between calls → the
-- top-2/top-6 slice that reaches the Gemini prompt differs → verdicts
-- drift (e.g. "compliant" flips to "partial").
--
-- This migration adds a stable tiebreaker so the same query on the
-- same data always returns rows in the same order.
-- ============================================================

create or replace function public.match_regulation_chunks(
  query_embedding  vector(768),
  match_count      int default 8,
  min_similarity   float default 0.55
)
returns table (
  chunk_id         uuid,
  regulation_id    uuid,
  regulation_title text,
  text_chunk       text,
  similarity       float
)
language sql stable
set search_path = public
as $$
  select
    rc.id          as chunk_id,
    rc.regulation_id,
    r.title        as regulation_title,
    rc.text_chunk,
    1 - (rc.embedding <=> query_embedding) as similarity
  from public.regulation_chunks rc
  join public.regulations r on r.id = rc.regulation_id
  where r.status = 'active'
    and 1 - (rc.embedding <=> query_embedding) >= min_similarity
  order by rc.embedding <=> query_embedding, rc.id
  limit match_count;
$$;

grant execute on function public.match_regulation_chunks(vector(768), int, float) to service_role;

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
  order by similarity desc, chunk_id
  limit match_count;
$$;

grant execute on function public.search_company_document_chunks(uuid, text, int) to service_role;