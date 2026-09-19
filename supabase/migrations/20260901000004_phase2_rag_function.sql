-- ============================================================
-- ECOPLY.AI — Phase 2: RAG Helper Function
-- pgvector cosine similarity search for regulation chunks
-- ============================================================

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
  order by rc.embedding <=> query_embedding   -- cosine distance ASC = most similar first
  limit match_count;
$$;

-- Grant execute to authenticated users (used by audit worker via admin client too)
grant execute on function public.match_regulation_chunks(vector, int) to authenticated;
grant execute on function public.match_regulation_chunks(vector, int) to service_role;
