-- ============================================================
-- ECOPLY.AI — Document fingerprint + model version on audit jobs
--
-- Enables:
--  * deterministic re-audit detection (same file bytes + same model
--    version → the audit is already done; frontend warns before
--    re-running Gemini),
--  * drift diagnostics (track which model produced each job).
--
-- Deliberately NOT a unique index: re-audits of the same document are
-- allowed (user opt-in), so multiple completed jobs may share a hash.
-- ============================================================

alter table public.audit_jobs
  add column if not exists document_hash text,
  add column if not exists model_version text;

create index if not exists audit_jobs_document_hash_idx
  on public.audit_jobs (company_id, document_hash, model_version);