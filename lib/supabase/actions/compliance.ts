"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  extractPagesFromBuffer,
  type ExtractedPage,
} from "@/lib/gemini/extract-text";
import {
  runComplianceAudit,
  postProcessAudit,
  type AreaRag,
  type RegulationChunk,
} from "@/lib/gemini/compliance";
import { AUDIT_AREAS } from "@/lib/compliance/areas";
import { AREA_QUERY_EMBEDDINGS } from "@/lib/compliance/area-embeddings";
import {
  computeAuditSignature,
} from "@/lib/compliance/signature";
import {
  EVIDENCE_TOP_K,
  REGULATION_TOP_K,
  MIN_SIMILARITY,
  MIN_TS_RANK,
  MODEL_VERSION,
  MAX_COMPANY_CHUNKS,
  COMPANY_CHUNK_SIZE,
  COMPANY_CHUNK_OVERLAP,
  MAX_REGULATIONS_CITED,
  MAX_EXCERPT_CHARS,
  PROMPT_EVIDENCE_TOP_K,
  PROMPT_REG_TOP_K,
} from "@/lib/compliance/pipeline";
import { friendlyGeminiError } from "@/lib/gemini/errors";
import { recordOpsEvent } from "@/lib/ops/events";
import { createHash } from "node:crypto";

type ActionResult = {
  error?: string;
  jobId?: string;
  success?: boolean;
  /** Set when an identical document+model was already audited (computed before any Gemini call). */
  duplicate?: {
    jobId: string;
    documentName: string;
    completedAt: string | null;
  };
};

/** SHA-256 content fingerprint of the uploaded file bytes. */
function computeDocumentHash(buffer: ArrayBuffer): string {
  return createHash("sha256").update(new Uint8Array(buffer)).digest("hex");
}

type MatchedEvidence = {
  chunk_id: string;
  page_number: number | null;
  section_title: string | null;
  text_chunk: string;
  similarity: number;
};

type MatchedRegChunk = RegulationChunk;

type CompanyChunk = {
  chunk_index: number;
  page_number: number | null;
  section_title: string | null;
  text_chunk: string;
  token_count: number | null;
  is_metadata: boolean;
};

// ── Page-aware chunking helpers ────────────────────────────

function isHeadingLine(line: string): boolean {
  if (/^[-•*▪□○§]+$/.test(line)) return false;
  if (
    /\bc\.\b|pasal\s|halaman\s|temuan\s|status\s|kriteria\s|angka\s|sumber\s/i.test(
      line,
    )
  )
    return false;
  // Numbered headings: "1. Strategi Keberlanjutan", "4.2 Tata Kelola"
  if (/^\d{1,2}(\.\d+)*[\s).:—\-]+\S/.test(line)) return true;
  // ALL-CAPS short-ish titles: "DATA KINERJA LINGKUNGAN"
  if (/^[A-Z][A-Z0-9 .&\-—]{5,60}$/.test(line)) return true;
  // Title case sentences that don't end with period (typical headings)
  if (
    /^[A-Z][A-Za-z&,'\-\/]{3,55}$/.test(line) &&
    !line.endsWith(".")
  )
    return true;
  return false;
}

function extractHeadings(cleanedText: string): { offset: number; line: string }[] {
  const headings: { offset: number; line: string }[] = [];
  let offset = 0;
  for (const raw of cleanedText.split("\n")) {
    const line = raw.trim();
    if (line.length >= 3 && line.length <= 90 && isHeadingLine(line)) {
      headings.push({ offset, line });
    }
    offset += raw.length + 1; // +1 for the '\n'
  }
  return headings;
}

function cleanPageText(text: string): string {
  return text
    .replace(/\f/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitWithOffsets(
  text: string,
  size: number,
  overlap: number,
): { start: number; text: string }[] {
  if (text.length <= size) {
    return text.trim().length >= 100 ? [{ start: 0, text: text.trim() }] : [];
  }

  const parts: { start: number; text: string }[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + size;
    if (end < text.length) {
      const nl = text.lastIndexOf("\n", end);
      const dot = text.lastIndexOf(". ", end);
      const boundary = Math.max(nl, dot);
      if (boundary > start + size / 2) end = boundary + 1;
    }
    const slice = text.slice(start, Math.min(end, text.length)).trim();
    if (slice.length >= 100) parts.push({ start, text: slice });
    const nextStart = Math.max(start + 1, end - overlap);
    if (nextStart <= start) break;
    start = nextStart;
  }
  return parts;
}

function sectionForOffset(
  headings: { offset: number; line: string }[],
  offset: number,
): string | null {
  let current: string | null = null;
  for (const h of headings) {
    if (h.offset <= offset) current = h.line;
    else break;
  }
  return current;
}

const METADATA_HEADING_PATTERNS = [
  /^daftar isi/i,
  /^table of contents/i,
  /^contents/i,
  /^indeks/i,
  /^index/i,
  /^glosarium/i,
  /^glossary/i,
  /^daftar tabel/i,
  /^daftar gambar/i,
  /^sangkalan/i,
  /^disclaimer/i,
];

/** GRI content-index / cross-reference tables (e.g. "No Nama Indeks"). */
const GRI_INDEX_PATTERNS = [
  /indeks\s+konten/i,
  /content\s+index/i,
  /^no\.?\s+nama\s+indeks/i,
  /^no\.?\s+nama\s+index/i,
];

/**
 * Page-level metadata detection. TOC / content-index pages are often split
 * into several chunks, so per-chunk detection misses every chunk after the
 * first. Since search_company_document_chunks keeps one chunk per page, the
 * whole page must be flagged — not just the chunk that happens to start at
 * the page's heading.
 */
function isMetadataPage(text: string): boolean {
  const head = text.replace(/\s+/g, " ").slice(0, 300);
  const headLower = head.toLowerCase();

  if (METADATA_HEADING_PATTERNS.some((p) => p.test(head))) return true;
  if (
    /^daftar\s+isi\b/i.test(headLower) &&
    /table\s+of\s+contents/i.test(headLower)
  ) {
    return true;
  }
  if (GRI_INDEX_PATTERNS.some((p) => p.test(headLower))) return true;
  // GRI content index tables list disclosures with page refs + an
  // "Omission / Yang Tidak Dicantumkan" column (navigation, not substance).
  if (
    /standar\s+gri/i.test(headLower) &&
    /(yang\s+tidak\s+dicantumkan|omission|ommission)/i.test(headLower)
  ) {
    return true;
  }
  return false;
}

/**
 * Heuristic: flag navigation chunks (TOC, index, glossary) that
 * pollute evidence retrieval. TOC/index pages are dense with keywords
 * but contain no substantive disclosure — ts_rank rewards them, the AI
 * then cites them. These are skipped by search_company_document_chunks.
 *
 * Real-world documents fail the old shape test because:
 *  - their TOC heading is a standalone line not captured as section_title,
 *  - they use LEADING page numbers ("4 PENDAHULUAN DAN IKHTISAR"), and
 *  - GRI index tables are wide columns, not dotted-leader pages.
 */
function isMetadataChunk(text: string, sectionTitle: string | null): boolean {
  const title = (sectionTitle ?? "").trim();
  const head = text.replace(/\s+/g, " ").slice(0, 300);
  const headLower = head.toLowerCase();

  // 1. Explicit heading — either captured section title or start of text.
  if (METADATA_HEADING_PATTERNS.some((p) => p.test(title))) return true;
  if (METADATA_HEADING_PATTERNS.some((p) => p.test(head))) return true;

  // 2. Bilingual TOC marker ("Daftar Isi Table of Contents ...").
  if (
    /^daftar\s+isi\b/i.test(headLower) &&
    /table\s+of\s+contents/i.test(headLower)
  ) {
    return true;
  }

  // 3. GRI content-index tables.
  if (GRI_INDEX_PATTERNS.some((p) => p.test(headLower))) return true;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 5 || lines.length > 90) return false;

  // 4. Repeated GRI disclosure-code lines (e.g. "305-1 ..."), an index hallmark.
  const griCodeLines = lines.filter((l) => /^\d{3}-\d{1,2}\s/.test(l)).length;
  if (griCodeLines / lines.length > 0.25) return true;

  // 5. TOC-shape heuristic: most lines are short AND lead with or end in a
  //    page number — either trailing ("3.2 Emisi ............ 29") or leading
  //    ("4 PENDAHULUAN DAN IKHTISAR", "105 TATA KELOLA ...").
  let navLines = 0;
  let pageNumbered = 0;
  for (const line of lines) {
    const stripped = line.replace(/[.·•\s]+/g, "");
    const shortish = line.length <= 60 && stripped.length <= 45;
    const leadsWithPg = /^\d{1,3}\s+[A-Z0-9]/.test(line);
    const endsWithPg = /(?:\d{2,3})\s*$/.test(line);
    if (shortish && (leadsWithPg || endsWithPg)) navLines++;
    if (endsWithPg) pageNumbered++;
  }
  if (pageNumbered > 0 && navLines / lines.length > 0.5) return true;

  return false;
}

function chunkDocumentPages(
  pages: ExtractedPage[],
): CompanyChunk[] {
  const chunks: CompanyChunk[] = [];
  let index = 0;

  for (const page of pages) {
    const cleaned = cleanPageText(page.text);
    const pageIsMetadata = isMetadataPage(cleaned);
    const headings = extractHeadings(cleaned);
    const parts = splitWithOffsets(cleaned, COMPANY_CHUNK_SIZE, COMPANY_CHUNK_OVERLAP);

    for (const part of parts) {
      if (index >= MAX_COMPANY_CHUNKS) break;
      const title = sectionForOffset(headings, part.start);
      chunks.push({
        chunk_index: index,
        page_number: page.pageNumber,
        section_title: title,
        text_chunk: part.text,
        token_count: Math.ceil(part.text.length / 4),
        // Page-level flag captures every chunk of a TOC/index page even when
        // only the first chunk contains the page heading text.
        is_metadata: pageIsMetadata || isMetadataChunk(part.text, title),
      });
      index++;
    }
    if (index >= MAX_COMPANY_CHUNKS) break;
  }

  return chunks;
}

/**
 * Submit + run compliance audit synchronously.
 * Progress is tracked via audit_jobs.status in DB.
 * Client polls status via [jobId] page.
 *
 * If an identical document (same bytes) was already audited with the same
 * model version, no Gemini call is made — the existing completed job is
 * returned via `duplicate` so the client can warn before re-auditing.
 * Pass `{ forceRerun: true }` to bypass the dedup and run a fresh audit.
 */
export async function submitAuditJob(
  formData: FormData,
  options?: { forceRerun?: boolean },
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "company" || !profile.company_id) {
    return { error: "Akun tidak terkait dengan perusahaan" };
  }

  const file = formData.get("document") as File | null;
  if (!file || file.size === 0) return { error: "Pilih dokumen untuk diaudit" };
  if (file.size > 50 * 1024 * 1024)
    return { error: "Ukuran file maksimal 50 MB" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["pdf", "doc", "docx", "txt"].includes(ext)) {
    return { error: "Format tidak didukung. Gunakan PDF, Word, atau TXT." };
  }

  const admin = createAdminClient();
  const documentHash = computeDocumentHash(await file.arrayBuffer());

  // 0. Dedup check — identical bytes + same model already audited?
  //    Skip upload + Gemini entirely; let the client show a re-audit warning.
  if (!options?.forceRerun) {
    const { data: existing } = await admin
      .from("audit_jobs")
      .select("id, document_name, completed_at, status")
      .eq("company_id", profile.company_id)
      .eq("document_hash", documentHash)
      .eq("model_version", MODEL_VERSION)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (existing.status === "done") {
        return {
          duplicate: {
            jobId: existing.id,
            documentName: existing.document_name,
            completedAt: existing.completed_at,
          },
        };
      }
      if (existing.status === "queued" || existing.status === "processing") {
        return { jobId: existing.id };
      }
    }
  }

  // 1. Upload file
  const storagePath = `${user.id}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("company-docs")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: `Upload gagal: ${uploadError.message}` };

  // 2. Create job
  const { data: job, error: jobError } = await admin
    .from("audit_jobs")
    .insert({
      company_id: profile.company_id,
      submitted_by: user.id,
      document_name: file.name,
      document_path: storagePath,
      file_size: file.size,
      document_hash: documentHash,
      model_version: MODEL_VERSION,
      status: "processing",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (jobError) return { error: jobError.message };

  try {
    // 3. Extract pages + validate
    const buffer = await file.arrayBuffer();
    const pages = await extractPagesFromBuffer(buffer, file.name);

    if (pages.length === 0) {
      await admin
        .from("audit_jobs")
        .update({
          status: "failed",
          error_message: "Gagal mengekstrak teks dari dokumen",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      return {
        error:
          "Tidak dapat membaca teks dari dokumen. Pastikan dokumen tidak terproteksi.",
      };
    }

    const totalChars = pages.reduce((sum, p) => sum + p.text.length, 0);
    if (totalChars < 100) {
      await admin
        .from("audit_jobs")
        .update({
          status: "failed",
          error_message: "Dokumen terlalu pendek / tidak bermakna",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      return {
        error: "Dokumen kosong atau terlalu pendek untuk dianalisis.",
      };
    }

    // 4. Page-aware chunking (preserves page boundaries + section titles)
    const companyChunks = chunkDocumentPages(pages);

    if (companyChunks.length >= MAX_COMPANY_CHUNKS) {
      await recordOpsEvent({
        kind: "compliance",
        level: "warn",
        message: `Dokumen besar: chunking dibatasi ${MAX_COMPANY_CHUNKS} chunks (dari ${pages.length} halaman)`,
        source: "action/submitAuditJob",
        metadata: { jobId: job.id, totalPages: pages.length },
      });
    }

    // 5. Store company chunks WITHOUT embeddings.
    // Evidence retrieval uses Postgres full-text search (migration 088) —
    // zero Gemini tokens, so audits fit tiny free-tier quotas.
    const { error: insertChunksError } = await admin
      .from("company_document_chunks")
      .insert(
        companyChunks.map((c) => ({
          job_id: job.id,
          chunk_index: c.chunk_index,
          page_number: c.page_number,
          section_title: c.section_title,
          text_chunk: c.text_chunk,
          token_count: c.token_count,
          is_metadata: c.is_metadata,
        })),
      );

    if (insertChunksError) {
      throw new Error(
        `Gagal menyimpan chunks dokumen: ${insertChunksError.message}`,
      );
    }

    // 6. Embedding for regulation retrieval.
    // The 12 area queries are static, so their embeddings are precomputed
    // constants (lib/compliance/area-embeddings.ts): deterministic across
    // audits, zero Gemini embedding tokens per run.
    const areaEmbeddings = AREA_QUERY_EMBEDDINGS;

    const areaRag: AreaRag[] = [];
    const citedMap = new Map<
      string,
      { id: string; title: string; chunks: MatchedRegChunk[] }
    >();

    for (const [areaIndex, area] of AUDIT_AREAS.entries()) {
      const [evidenceRes, regRes] = await Promise.all([
        admin.rpc("search_company_document_chunks", {
          p_job_id: job.id,
          search_query: area.search_terms,
          match_count: EVIDENCE_TOP_K,
        }),
        admin.rpc("match_regulation_chunks", {
          query_embedding: areaEmbeddings[areaIndex],
          match_count: REGULATION_TOP_K,
          min_similarity: MIN_SIMILARITY,
        }),
      ]);

      const evidence = ((evidenceRes.data ?? []) as MatchedEvidence[])
        .filter((e) => e.similarity >= MIN_TS_RANK)
        .sort((a, b) => b.similarity - a.similarity);

      const regs = ((regRes.data ?? []) as MatchedRegChunk[]).sort(
        (a, b) => b.similarity - a.similarity,
      );

      for (const r of regs) {
        if (!citedMap.has(r.regulation_id)) {
          citedMap.set(r.regulation_id, {
            id: r.regulation_id,
            title: r.regulation_title,
            chunks: [r],
          });
        } else {
          const entry = citedMap.get(r.regulation_id)!;
          if (!entry.chunks.some((c) => c.chunk_id === r.chunk_id)) {
            entry.chunks.push(r);
          }
        }
      }

      areaRag.push({ area: area.name, evidence, regulationChunks: regs });
    }

    // 6b. Deterministic input signature — the exact bytes of what the model
    // would see. If an identical document + model + retrieval slice was
    // already audited, reuse that report verbatim and NEVER call the LLM:
    // guarantees bit-identical output and zero extra token spend.
    const inputSignature = computeAuditSignature(
      documentHash,
      MODEL_VERSION,
      areaRag,
    );

    const { data: reusableReports } = await admin
      .from("audit_reports")
      .select(
        "id, job_id, compliance_status, summary, findings, recommendations, action_items, regulations_cited, area_rag, model_version, prompt_tokens, completion_tokens, created_at",
      )
      .eq("input_signature", inputSignature)
      .eq("model_version", MODEL_VERSION)
      .order("created_at", { ascending: false })
      .limit(5);

    // Only reuse a report that belongs to the same company, is finished,
    // and really came from the same file (defense in depth; the signature
    // already encodes document hash + model + retrieval slice).
    let sourceReport:
      | (NonNullable<typeof reusableReports>[number])
      | undefined;

    for (const candidate of reusableReports ?? []) {
      const { data: srcJob } = await admin
        .from("audit_jobs")
        .select("company_id, status, document_hash")
        .eq("id", candidate.job_id)
        .maybeSingle();
      if (
        srcJob &&
        srcJob.company_id === profile.company_id &&
        srcJob.status === "done" &&
        srcJob.document_hash === documentHash
      ) {
        sourceReport = candidate;
        break;
      }
    }

    if (sourceReport) {
      await recordOpsEvent({
        kind: "compliance",
        level: "info",
        message:
          "Audit reuse: input identik (dokumen + model + slice RAG) → hasil lama disalin tanpa memanggil Gemini",
        source: "action/submitAuditJob",
        metadata: { jobId: job.id, sourceReportId: sourceReport.id },
      });

      const { data: reportData, error: reportError } = await admin
        .from("audit_reports")
        .insert({
          job_id: job.id,
          compliance_status: sourceReport.compliance_status,
          summary: sourceReport.summary,
          findings: sourceReport.findings,
          recommendations: sourceReport.recommendations,
          action_items: sourceReport.action_items,
          regulations_cited: sourceReport.regulations_cited,
          model_version: MODEL_VERSION,
          prompt_tokens: 0,
          completion_tokens: 0,
          input_signature: inputSignature,
          reused_from_report_id: sourceReport.id,
        })
        .select("id")
        .single();

      if (reportError) {
        throw new Error(
          `Gagal menyimpan laporan (reuse): ${reportError.message}`,
        );
      }
      if (!reportData?.id) {
        throw new Error(
          "Gagal mendapatkan ID audit report setelah insert (reuse).",
        );
      }

      // Persist the same source slices so the review page can show them.
      if (sourceReport.area_rag) {
        const { error: areaRagError } = await admin
          .from("audit_reports")
          .update({ area_rag: sourceReport.area_rag })
          .eq("id", reportData.id);
        if (areaRagError) {
          await recordOpsEvent({
            kind: "compliance",
            level: "warn",
            message: `Gagal menyimpan area_rag (reuse): ${areaRagError.message}`,
            source: "action/submitAuditJob",
            metadata: { jobId: job.id },
          });
        }
      }

      const reusedItems = (sourceReport.action_items ?? []) as unknown as {
        task?: string;
      }[];
      if (Array.isArray(reusedItems) && reusedItems.length > 0) {
        const { error: actionItemsError } = await admin
          .from("audit_action_items")
          .insert(
            reusedItems.map((item, index) => ({
              report_id: reportData.id,
              item_index: index,
              task: item?.task ?? "",
            })),
          );
        if (actionItemsError) {
          throw new Error(
            `Gagal menyimpan action items (reuse): ${actionItemsError.message}`,
          );
        }
      }

      await admin
        .from("audit_jobs")
        .update({
          status: "done",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      revalidatePath("/company/compliance");
      return { jobId: job.id };
    }

    // 7. Run Gemini audit with page-aware RAG context
    const auditResult = await runComplianceAudit(areaRag);

    // 7b. Deterministic post-processing — never trusts the model on
    // evidence self-contradiction (e.g. "compliant" + "belum dapat
    // dipublikasikan"). Scans model quotes AND the deterministic RAG
    // evidence chunks, pure string scan, identical across re-audits.
    const auditOutput = postProcessAudit(auditResult.output, areaRag);

    // 8. Build regulations_cited: sorted by best similarity desc
    const regulationsCited = Array.from(citedMap.values())
      .sort((a, b) => {
        const bestA = Math.max(...a.chunks.map((c) => c.similarity));
        const bestB = Math.max(...b.chunks.map((c) => c.similarity));
        return bestB - bestA;
      })
      .slice(0, MAX_REGULATIONS_CITED)
      .map((r) => ({
        id: r.id,
        title: r.title,
        excerpts: r.chunks
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 3)
          .map((c) => c.text_chunk.slice(0, MAX_EXCERPT_CHARS)),
      }));

    // 9. Save audit report
    const { data: reportData, error: reportError } = await admin
      .from("audit_reports")
      .insert({
        job_id: job.id,
        compliance_status: auditOutput.compliance_status,
        summary: auditOutput.summary,
        findings: auditOutput.findings,
        recommendations: auditOutput.recommendations,
        action_items: auditOutput.action_items,
        regulations_cited: regulationsCited,
        model_version: MODEL_VERSION,
        prompt_tokens: auditResult.promptTokens,
        completion_tokens: auditResult.completionTokens,
        input_signature: inputSignature,
      })
      .select("id")
      .single();

    if (reportError) {
      throw new Error(`Gagal menyimpan laporan: ${reportError.message}`);
    }

    if (!reportData?.id) {
      throw new Error("Gagal mendapatkan ID audit report setelah insert.");
    }

    // 9b. Persist the exact RAG slices the model saw (full text) so the
    // review page can show the sources behind each conclusion. Optional
    // metadata — failure must not fail the audit.
    const auditSourceRag = areaRag.map((entry) => ({
      area: entry.area,
      evidence: entry.evidence.slice(0, PROMPT_EVIDENCE_TOP_K).map((e) => ({
        page_number: e.page_number,
        section_title: e.section_title,
        similarity: e.similarity,
        text_chunk: e.text_chunk,
      })),
      regulations: entry.regulationChunks
        .slice(0, PROMPT_REG_TOP_K)
        .map((r) => ({
          regulation_id: r.regulation_id,
          regulation_title: r.regulation_title,
          similarity: r.similarity,
          text_chunk: r.text_chunk,
        })),
    }));

    const { error: areaRagError } = await admin
      .from("audit_reports")
      .update({ area_rag: auditSourceRag })
      .eq("id", reportData.id);

    if (areaRagError) {
      await recordOpsEvent({
        kind: "compliance",
        level: "warn",
        message: `Gagal menyimpan area_rag: ${areaRagError.message}`,
        source: "action/submitAuditJob",
        metadata: { jobId: job.id },
      });
    }

    // Insert action item rows for tracking
    if (auditOutput.action_items.length > 0) {
      const { error: actionItemsError } = await admin
        .from("audit_action_items")
        .insert(
          auditOutput.action_items.map((item, index) => ({
            report_id: reportData.id,
            item_index: index,
            task: item.task,
          })),
        );

      if (actionItemsError) {
        throw new Error(
          `Gagal menyimpan action items: ${actionItemsError.message}`,
        );
      }
    }

    // 10. Mark done
    await admin
      .from("audit_jobs")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const friendly = friendlyGeminiError(err, { fallback: message });

    await recordOpsEvent({
      kind: "gemini",
      level: "error",
      message,
      source: "action/submitAuditJob",
      metadata: { jobId: job.id },
    });

    await admin
      .from("audit_jobs")
      .update({
        status: "failed",
        error_message: friendly,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    return { error: friendly };
  }

  revalidatePath("/company/compliance");
  return { jobId: job.id };
}

/**
 * Delete audit job beserta report, action items, chunks, dan file dokumen.
 * Hanya untuk job dengan status 'done' atau 'failed'.
 */
export async function deleteAuditJob(jobId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "company" || !profile.company_id) {
    return { error: "Akun tidak terkait dengan perusahaan" };
  }

  // Fetch job + verify ownership
  const { data: job } = await supabase
    .from("audit_jobs")
    .select("id, company_id, status, document_path")
    .eq("id", jobId)
    .eq("company_id", profile.company_id)
    .single();

  if (!job) return { error: "Job tidak ditemukan atau bukan milik Anda" };

  if (job.status === "processing" || job.status === "queued") {
    return {
      error: "Tidak dapat menghapus job yang sedang diproses. Tunggu hingga selesai.",
    };
  }

  // Use admin client to bypass RLS for cascade deletes
  const admin = createAdminClient();

  // 1. Delete action items (FK ke audit_reports)
  const { data: report } = await admin
    .from("audit_reports")
    .select("id")
    .eq("job_id", jobId)
    .maybeSingle();

  if (report) {
    await admin
      .from("audit_action_items")
      .delete()
      .eq("report_id", report.id);

    // 2. Delete audit report
    await admin.from("audit_reports").delete().eq("id", report.id);
  }

  // 3. Delete file dari storage (jika ada)
  if (job.document_path) {
    await supabase.storage.from("company-docs").remove([job.document_path]);
  }

  // 4. Delete company_document_chunks (auto via CASCADE on job, explicit for clarity)
  await admin
    .from("company_document_chunks")
    .delete()
    .eq("job_id", jobId);

  // 5. Delete job
  const { error: deleteError } = await admin
    .from("audit_jobs")
    .delete()
    .eq("id", jobId);

  if (deleteError) return { error: deleteError.message };

  revalidatePath("/company/compliance");
  return { success: true };
}