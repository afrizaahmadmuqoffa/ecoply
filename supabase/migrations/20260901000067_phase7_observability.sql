-- ============================================================
-- FASE 7 — Observability & Rate Limiting
--   ops_events      : buku catatan kejadian (error Gemini, job gagal,
--                     rate-limit, panggilan lambat, cron). Append-only.
--   api_rate_limits : penghitung sliding window per-rute untuk rate limit.
-- ============================================================

-- ── ops_events ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ops_events (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,                    -- gemini | job | rate_limit | slow_call | cron | system
  level       text not null default 'info'
              check (level in ('info', 'warn', 'error')),
  message     text not null,
  source      text,                              -- route / action / job ref
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

COMMENT ON TABLE public.ops_events IS
  'Append-only operational events. Written via service-role/client, read by admin.';

CREATE INDEX IF NOT EXISTS ops_events_created_at_idx
  ON public.ops_events(created_at DESC);

CREATE INDEX IF NOT EXISTS ops_events_kind_idx
  ON public.ops_events(kind);

ALTER TABLE public.ops_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops_events: admin can read"
  ON public.ops_events
  FOR SELECT
  USING (public.is_admin());

-- -- insert/update/delete tanpa policy → hanya service_role (bypass RLS)

-- ── api_rate_limits ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  count         int not null default 1,
  primary key (key, window_start)
);

COMMENT ON TABLE public.api_rate_limits IS
  'Sliding-window rate limit counters. Written/read via service-role only.';

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
-- tanpa policy → deny untuk anon/authenticated; hanya service_role yang bisa.

-- ── Helper: catat kejadian ops (dipanggil service-role) ────
CREATE OR REPLACE FUNCTION public.record_ops_event(
  p_kind text,
  p_level text,
  p_message text,
  p_source text default null,
  p_metadata jsonb default '{}'::jsonb
)
RETURNS uuid
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.ops_events (kind, level, message, source, metadata)
  VALUES (p_kind, p_level, p_message, p_source, p_metadata)
  RETURNING id;
$$;

REVOKE ALL ON FUNCTION public.record_ops_event(text, text, text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.record_ops_event(text, text, text, text, jsonb) TO service_role;