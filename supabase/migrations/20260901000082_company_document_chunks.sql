-- ============================================================
-- ECOPLY.AI — Phase 2b: Company document chunks (page-aware RAG)
-- Adds:
--   1. company_document_chunks table + per-job embeddings
--   2. match_company_document_chunks RPC (NOT SECURITY DEFINER)
--   3. match_regulation_chunks: + min_similarity, drop SECURITY
--      DEFINER, revoke EXECUTE from authenticated
--   4. compliance_status enum rename: insufficient_data -> not_assessed
-- ============================================================

-- ── 1. company_document_chunks ────────────────────────────
create table public.company_document_chunks (
  id             uuid primary key default uuid_generate_v4(),
  job_id         uuid not null references public.audit_jobs(id) on delete cascade,
  chunk_index    integer not null,          -- order within a job
  page_number    integer,                   -- original PDF page (1-based); NULL for non-PDF
  section_title  text,                      -- nearest heading detected before the chunk
  text_chunk     text not null,
  embedding      vector(768),
  token_count    integer,
  created_at     timestamptz not null default now(),
  unique (job_id, chunk_index)
);

comment on table public.company_document_chunks is 'Page-aware text chunks + embeddings of audited company documents';

create index company_document_chunks_embedding_idx
  on public.company_document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index company_document_chunks_job_idx
  on public.company_document_chunks(job_id);

alter table public.company_document_chunks enable row level security;

-- Company can read chunks of its own audit jobs only.
-- Write access stays service-role only (no insert/update policies).
create policy "cndc: company can read own"
  on public.company_document_chunks for select
  using (
    job_id in (
      select aj.id from public.audit_jobs aj
      join public.profiles p on p.company_id = aj.company_id
      where p.id = auth.uid()
    )
  );

-- ── 2. Company doc chunk matcher (NOT SECURITY DEFINER) ───
create or replace function public.match_company_document_chunks(
  query_embedding  vector(768),
  p_job_id         uuid,
  match_count      int default 5,
  min_similarity   float default 0.55
)
returns table (
  chunk_id      uuid,
  page_number   integer,
  section_title text,
  text_chunk    text,
  similarity    float
)
language sql stable
set search_path = public
as $$
  select
    cdc.id,
    cdc.page_number,
    cdc.section_title,
    cdc.text_chunk,
    1 - (cdc.embedding <=> query_embedding) as similarity
  from public.company_document_chunks cdc
  where cdc.job_id = p_job_id
    and 1 - (cdc.embedding <=> query_embedding) >= min_similarity
  order by cdc.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_company_document_chunks(vector(768), uuid, int, float) to service_role;

-- ── 3. Regulation chunk matcher hardening ─────────────────
drop function if exists public.match_regulation_chunks(vector, int);
drop function if exists public.match_regulation_chunks(vector(768), int);
drop function if exists public.match_regulation_chunks(vector(768), int, float);

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
  order by rc.embedding <=> query_embedding
  limit match_count;
$$;

-- REGRESSION: previously granted to authenticated (security M-12).
-- Now only reachable server-side (service_role / admin client).
revoke execute on function public.match_regulation_chunks(vector(768), int, float) from authenticated, public;
grant execute on function public.match_regulation_chunks(vector(768), int, float) to service_role;

-- ── 4. Enum consistency ───────────────────────────────────
alter type public.compliance_status rename value 'insufficient_data' to 'not_assessed';