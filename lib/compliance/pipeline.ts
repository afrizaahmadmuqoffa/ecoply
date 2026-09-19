/**
 * Shared compliance pipeline constants — single source of truth so the
 * (now single) RAG pipeline can't drift between two implementations.
 */

export const EVIDENCE_TOP_K = 6
export const REGULATION_TOP_K = 2
/** Budget inside the Gemini prompt (kept small for tiny free-tier quota). */
export const PROMPT_EVIDENCE_TOP_K = 3
export const PROMPT_REG_TOP_K = 2
export const PROMPT_REG_EXCERPT_CHARS = 350
export const MIN_SIMILARITY = 0.55

/**
 * Floor for the FTS evidence relevance score (ts_rank_cd output) so
 * garbage-low matches (TOC/index remnants, single stray keyword) don't
 * pollute the Gemini prompt as "evidence".
 */
export const MIN_TS_RANK = 0.001

/** Single source of truth for the Gemini model used by the audit pipeline. */
export const MODEL_VERSION =
  process.env.GEMINI_MODEL ?? "gemini-2.0-flash-lite"

/**
 * Fixed decoding seed for the audit model. Combined with temperature 0 and
 * topK 1 this makes repeated audits of the same prompt (same document + same
 * deterministic RAG slices) return the same verdict instead of flapping.
 * Gemini documents seed as best-effort, so the report-reuse layer remains the
 * hard guarantee; seed removes the run-to-run sampling variance on top.
 */
export const AUDIT_SEED = 42

/** Soft cap on stored company-document chunks per job. */
export const MAX_COMPANY_CHUNKS = 800

export const COMPANY_CHUNK_SIZE = 1800
export const COMPANY_CHUNK_OVERLAP = 150

/** How many regulation chunks are capped inside the regulations_cited report field. */
export const MAX_REGULATIONS_CITED = 12

/** Max chars of a document quote inserted into the prompt/report. */
export const MAX_QUOTE_CHARS = 600

/** Max chars per regulation excerpt inside the regulations_cited report field. */
export const MAX_EXCERPT_CHARS = 400