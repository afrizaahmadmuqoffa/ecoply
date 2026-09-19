-- ============================================================
-- ECOPLY.AI — Store the exact RAG slices the model saw
--
-- `area_rag` holds, per audit area, the FULL text of the evidence
-- and regulation chunks that were fed to Gemini (top-evidence +
-- top-regulation per area). Used only for review/analysis on the
-- report page — never sent to Gemini again.
-- ============================================================

alter table public.audit_reports
  add column if not exists area_rag jsonb;