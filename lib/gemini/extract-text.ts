/**
 * Extract plain text from various document formats.
 * Runs server-side only (Node.js environment).
 *
 * Strategy:
 * - PDF: use unpdf (WASM-based, works in Next.js App Router)
 * - DOCX: extract XML text nodes via JSZip
 * - TXT / DOC: decode as UTF-8
 */

export async function extractTextFromBuffer(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<string> {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''

  if (ext === 'pdf') return extractPdf(buffer)
  if (ext === 'docx') return extractDocx(buffer)

  // TXT, DOC (best-effort), or unknown
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
}

export type ExtractedPage = { pageNumber: number; text: string }

/**
 * Extract text page-by-page (page boundaries preserved).
 * PDF → one entry per PDF page; DOCX/TXT/DOC → a single "page".
 * Empty pages are dropped; page numbers keep their 1-based index.
 * Used by the compliance pipeline to build page-aware evidence chunks.
 */
export async function extractPagesFromBuffer(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<ExtractedPage[]> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""

  if (ext === "pdf") {
    try {
      const { extractText } = await import("unpdf")
      const result = await extractText(new Uint8Array(buffer), {
        mergePages: false,
      })
      const pages = Array.isArray(result.text) ? result.text : [result.text]
      return pages
        .map((text, i) => ({ pageNumber: i + 1, text: text ?? "" }))
        .filter((p) => p.text.trim().length > 0)
    } catch (err) {
      console.error("[extract-text] PDF page extraction failed:", err)
      return []
    }
  }

  const text = await extractTextFromBuffer(buffer, fileName)
  return text.trim().length > 0 ? [{ pageNumber: 1, text }] : []
}

// ── PDF via unpdf ─────────────────────────────────────────
// unpdf uses PDF.js compiled to WASM — no native deps, works in Next.js

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  try {
    const { extractText } = await import('unpdf')
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true })
    return text ?? ''
  } catch (err) {
    console.error('[extract-text] PDF extraction failed:', err)
    return ''
  }
}

// ── DOCX via JSZip ────────────────────────────────────────

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  try {
    const JSZipModule = await import('jszip')
    const JSZip = JSZipModule.default
    const zip = await JSZip.loadAsync(buffer)

    const xmlFile = zip.file('word/document.xml')
    if (!xmlFile) return ''

    const xml = await xmlFile.async('string')

    return xml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  } catch (err) {
    console.error('[extract-text] DOCX extraction failed:', err)
    return ''
  }
}
