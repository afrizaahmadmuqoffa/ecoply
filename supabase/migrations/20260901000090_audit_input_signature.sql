-- ============================================================
-- ECOPLY.AI — Deterministic audit input signature + reuse
--
-- Every completed audit now records a SHA-256 `input_signature`
-- over (document_hash, model_version, canonical areaRag). Before an
-- LLM call, submitAuditJob recomputes the signature of the current
-- retrieval slice; if an existing DONE report for the same company
-- + document + model + signature exists, that report is reused
-- verbatim (no Gemini call) → identical documents always produce
-- identical reports, and duplicate audits cost zero extra tokens.
--
-- `reused_from_report_id` points at the source report when a job was
-- served from the reuse cache (NULL for first-time audits). The
-- report body is still copied into the new job's row so downstream
-- tables (audit_action_items) keep per-job semantics.
--
-- Deliberately NOT a unique index: several jobs may legitimately
-- share a signature (reuse) while others are force-fresh/re-audited.
-- ============================================================

alter table public.audit_reports
  add column if not exists input_signature text,
  add column if not exists reused_from_report_id uuid;

create index if not exists audit_reports_input_signature_idx
  on public.audit_reports (input_signature);