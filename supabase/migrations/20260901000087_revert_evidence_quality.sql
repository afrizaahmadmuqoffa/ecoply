-- ============================================================
-- ECOPLY.AI — Revert migration 086 (evidence-quality experiment)
--
-- The is_nav filter + heading setweight + curated search terms made
-- the audit over-assign "compliant". Restore the pre-086 behavior:
--  1. search_company_document_chunks back to the OR (to_tsquery) version
--     WITHOUT the `is_nav` filter.
--  2. Search tsvector trigger back to plain concatenation (no setweight).
--  3. Drop the is_nav column (its index goes with it).
-- ============================================================

-- ── 1. RPC: 086 version (no is_nav filter) ─────────────────
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

grant execute on function public.search_company_document_chunks(uuid, text, int) to service_role;

-- ── 2. Trigger back to plain tsvector (no setweight) ───────
create or replace function public.company_document_chunks_set_tsv()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_tsv := to_tsvector(
    'simple',
    coalesce(new.section_title, '') || ' ' || new.text_chunk
  );
  return new;
end;
$$;

-- ── 3. Drop is_nav (drops the nav index automatically) ────
alter table public.company_document_chunks
  drop column if exists is_nav;

-- Recompute search_tsv to match the plain (non-weighted) trigger
update public.company_document_chunks
  set search_tsv = to_tsvector(
    'simple',
    coalesce(section_title, '') || ' ' || text_chunk
  );