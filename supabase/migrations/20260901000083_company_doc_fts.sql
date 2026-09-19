-- ============================================================
-- ECOPLY.AI — Phase 2c: Keyword-first evidence retrieval (FTS)
--
-- Why: company-document embeddings are too expensive for small
-- Gemini quotas (≤30k TPM / 100 RPM). Evidence retrieval moves to
-- Postgres full-text search (0 Gemini tokens); only the 12 area
-- queries are embedded for the regulation matcher.
--
-- 1. company_document_chunks.search_tsv + trigger + GIN index
-- 2. search_company_document_chunks RPC (NOT SECURITY DEFINER)
-- ============================================================

-- ── 1. tsvector column ────────────────────────────────────
alter table public.company_document_chunks
  add column if not exists search_tsv tsvector;

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

drop trigger if exists company_document_chunks_set_tsv on public.company_document_chunks;
create trigger company_document_chunks_set_tsv
  before insert or update of section_title, text_chunk
  on public.company_document_chunks
  for each row execute function public.company_document_chunks_set_tsv();

-- Backfill rows inserted before this migration (embedding-based era)
update public.company_document_chunks
  set search_tsv = to_tsvector(
    'simple',
    coalesce(section_title, '') || ' ' || text_chunk
  )
  where search_tsv is null;

create index if not exists company_document_chunks_tsv_idx
  on public.company_document_chunks using gin(search_tsv);

-- ── 2. Keyword search RPC (NOT SECURITY DEFINER) ──────────
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
    ts_rank(cdc.search_tsv, q) as similarity
  from public.company_document_chunks cdc,
       websearch_to_tsquery('simple', search_query) q
  where cdc.job_id = p_job_id
    and q is not null
    and cdc.search_tsv @@ q
  order by similarity desc
  limit match_count;
$$;

grant execute on function public.search_company_document_chunks(uuid, text, int) to service_role;