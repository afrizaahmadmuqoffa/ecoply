-- ============================================================
-- ECOPLY.AI — Phase 2: Compliance AI
-- Tables: regulation_chunks, audit_jobs, audit_reports
-- ============================================================

-- Enable pgvector (should already be enabled from phase 0, safe to repeat)
create extension if not exists "vector";

-- ============================================================
-- REGULATION CHUNKS
-- Stores text chunks + embeddings for RAG retrieval
-- ============================================================

create table public.regulation_chunks (
  id              uuid primary key default uuid_generate_v4(),
  regulation_id   uuid not null references public.regulations(id) on delete cascade,
  chunk_index     integer not null,           -- order within document
  text_chunk      text not null,
  embedding       vector(768),                -- gemini-embedding-001 with outputDimensionality=768
  token_count     integer,
  created_at      timestamptz not null default now(),
  unique (regulation_id, chunk_index)
);

comment on table public.regulation_chunks is 'Text chunks + embeddings for RAG-based Compliance AI';

-- IVFFlat index for fast cosine similarity search (works up to 2000 dims)
create index regulation_chunks_embedding_idx
  on public.regulation_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index regulation_chunks_regulation_idx
  on public.regulation_chunks(regulation_id);

-- ============================================================
-- AUDIT JOBS
-- Queue for document audit processing
-- ============================================================

create type public.job_status as enum (
  'queued', 'processing', 'done', 'failed'
);

create table public.audit_jobs (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  submitted_by    uuid not null references auth.users(id),
  document_name   text not null,
  document_path   text not null,              -- storage path in company-docs bucket
  file_size       bigint,
  status          public.job_status not null default 'queued',
  error_message   text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.audit_jobs is 'Queue for async document audit processing';

create trigger audit_jobs_updated_at
  before update on public.audit_jobs
  for each row execute function public.handle_updated_at();

create index aj_company_idx on public.audit_jobs(company_id);
create index aj_status_idx  on public.audit_jobs(status);

-- ============================================================
-- AUDIT REPORTS
-- Structured output from Compliance AI
-- ============================================================

create type public.compliance_status as enum (
  'compliant', 'partial', 'non_compliant', 'insufficient_data'
);

create table public.audit_reports (
  id                  uuid primary key default uuid_generate_v4(),
  job_id              uuid not null references public.audit_jobs(id) on delete cascade unique,
  compliance_status   public.compliance_status not null,
  summary             text,
  findings            jsonb not null default '[]',    -- array of {area, status, detail}
  recommendations     jsonb not null default '[]',    -- array of {priority, action}
  action_items        jsonb not null default '[]',    -- to-do list from AI
  regulations_cited   jsonb not null default '[]',    -- [{id, title, chunk_ids[]}]
  model_version       text,                           -- which Gemini model was used
  prompt_tokens       integer,
  completion_tokens   integer,
  created_at          timestamptz not null default now()
);

comment on table public.audit_reports is 'Structured output from Compliance AI audit';

create index ar_job_idx on public.audit_reports(job_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.regulation_chunks enable row level security;
alter table public.audit_jobs         enable row level security;
alter table public.audit_reports      enable row level security;

-- ── regulation_chunks ──────────────────────────────────────
-- Authenticated users can read (needed for RAG queries)
create policy "chunks: authenticated can read"
  on public.regulation_chunks for select
  using (auth.role() = 'authenticated');

-- Only service role inserts (via embedding pipeline)
-- No insert policy needed — use admin/service client

-- ── audit_jobs ─────────────────────────────────────────────
-- Company sees only their own jobs
create policy "audit_jobs: company can read own"
  on public.audit_jobs for select
  using (
    company_id in (
      select company_id from public.profiles where id = auth.uid()
    )
  );

create policy "audit_jobs: company can insert"
  on public.audit_jobs for insert
  with check (
    company_id in (
      select company_id from public.profiles
      where id = auth.uid() and role = 'company'
    )
  );

-- Admin can read all jobs
create policy "audit_jobs: admin can read all"
  on public.audit_jobs for select
  using (public.is_admin());

-- ── audit_reports ───────────────────────────────────────────
-- Company sees reports for their jobs
create policy "audit_reports: company can read own"
  on public.audit_reports for select
  using (
    job_id in (
      select aj.id from public.audit_jobs aj
      join public.profiles p on p.company_id = aj.company_id
      where p.id = auth.uid()
    )
  );

-- Admin can read all
create policy "audit_reports: admin can read all"
  on public.audit_reports for select
  using (public.is_admin());
