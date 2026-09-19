-- ============================================================
-- Fix: use 768 dims for pgvector compatibility
-- gemini-embedding-001 supports outputDimensionality=768
-- Supabase pgvector max index dims = 2000 (IVFFlat & HNSW)
-- ============================================================

-- Drop old index
drop index if exists public.regulation_chunks_embedding_idx;

-- Alter column to 768 dims (was incorrectly set to 3072)
alter table public.regulation_chunks
  alter column embedding type vector(768);

-- Recreate IVFFlat index (works fine at 768 dims)
create index regulation_chunks_embedding_idx
  on public.regulation_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Drop and recreate RAG function with 768 dims
drop function if exists public.match_regulation_chunks(vector, int);

create or replace function public.match_regulation_chunks(
  query_embedding  vector(768),
  match_count      int default 8
)
returns table (
  chunk_id         uuid,
  regulation_id    uuid,
  regulation_title text,
  text_chunk       text,
  similarity       float
)
language sql stable
security definer
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
  order by rc.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_regulation_chunks(vector, int) to authenticated;
grant execute on function public.match_regulation_chunks(vector, int) to service_role;
