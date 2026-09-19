/**
 * Deterministic audit input signature.
 *
 * `computeAuditSignature` hashes exactly what runComplianceAudit feeds to
 * the model (document hash + model version + the top evidence/regulation
 * slices per area). Because the retrieval pipeline is deterministic (FTS +
 * pgvector with tie-broken ORDER BY, constant area-query embeddings), the
 * same document + model yields the same signature on every re-audit.
 *
 * submitAuditJob stores the signature on audit_reports. On a later audit of
 * the same document, if a DONE report with the same signature already exists,
 * that report is reused verbatim WITHOUT calling the LLM — guaranteeing
 * bit-identical results for identical input and costing zero extra tokens.
 *
 * Volatile fields (chunk_id — a fresh UUID per job) are dropped from the
 * canonical form so re-audits of the same file produce an equal signature.
 */
import { createHash } from "node:crypto";
import type { AreaRag } from "@/lib/gemini/compliance";
import {
  PROMPT_EVIDENCE_TOP_K,
  PROMPT_REG_TOP_K,
} from "@/lib/compliance/pipeline";

/** Recursive canonical JSON serialization: object keys sorted, arrays in order. */
function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = (Object.entries(value as Record<string, unknown>) as [
      string,
      unknown,
    ][])
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, canonicalStringify(v)] as [string, string])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${v}`);
    return `{${entries.join(",")}}`;
  }
  return typeof value === "number" ? String(value) : JSON.stringify(value);
}

/**
 * Canonical projection of the RAG slices that actually reach the prompt,
 * stripped of per-job UUIDs. Order is preserved (it is deterministic after
 * the SQL tie-breakers + constant embeddings).
 */
export function canonicalAreaRag(areaRag: AreaRag[]): {
  area: string;
  evidence: {
    page_number: number | null;
    section_title: string | null;
    text_chunk: string;
    similarity: number;
  }[];
  regulationChunks: {
    regulation_id: string;
    regulation_title: string;
    text_chunk: string;
    similarity: number;
  }[];
}[] {
  return areaRag.map((a) => ({
    area: a.area,
    evidence: a.evidence.slice(0, PROMPT_EVIDENCE_TOP_K).map((e) => ({
      page_number: e.page_number ?? null,
      section_title: e.section_title ?? null,
      text_chunk: e.text_chunk,
      similarity: e.similarity,
    })),
    regulationChunks: a.regulationChunks
      .slice(0, PROMPT_REG_TOP_K)
      .map((r) => ({
        regulation_id: r.regulation_id,
        regulation_title: r.regulation_title,
        text_chunk: r.text_chunk,
        similarity: r.similarity,
      })),
  }));
}

/** SHA-256 content hash of the exact audit input (doc + model + RAG slices). */
export function computeAuditSignature(
  documentHash: string,
  modelVersion: string,
  areaRag: AreaRag[],
): string {
  const payload = {
    documentHash,
    modelVersion,
    areas: canonicalAreaRag(areaRag),
  };
  return createHash("sha256")
    .update(canonicalStringify(payload))
    .digest("hex");
}