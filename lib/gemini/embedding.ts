import { type EmbedContentRequest } from '@google/generative-ai'
import { withGeminiRetry } from './key-rotator'

export const EMBEDDING_DIMS = 768

/** Gemini batchEmbedContents allows at most 100 requests per batch. */
export const EMBED_BATCH_LIMIT = 100

type EmbedRequestWithDims = EmbedContentRequest & { outputDimensionality?: number }

/**
 * Generate embedding for a single text.
 * Automatically retries with next API key on rate limit.
 */
export async function embedText(text: string): Promise<number[]> {
  return withGeminiRetry(async (genAI) => {
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-001',
    })
    const req: EmbedRequestWithDims = {
      content: { role: 'user', parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMS,
    }
    const result = await model.embedContent(req as EmbedContentRequest)
    return result.embedding.values
  })
}

/**
 * Batch embed multiple texts.
 * Automatically splits into batches of at most EMBED_BATCH_LIMIT (Gemini
 * hard limit: 100) and retries each batch with the next API key on rate limit.
 */
export async function batchEmbedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const allEmbeddings: number[][] = []

  for (let i = 0; i < texts.length; i += EMBED_BATCH_LIMIT) {
    const slice = texts.slice(i, i + EMBED_BATCH_LIMIT)

    const embeddings = await withGeminiRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-001',
      })

      type BatchRequest = { content: { role: string; parts: { text: string }[] }; outputDimensionality: number }
      const requests: BatchRequest[] = slice.map((text) => ({
        content: { role: 'user', parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMS,
      }))

      const result = await model.batchEmbedContents(
        { requests } as Parameters<typeof model.batchEmbedContents>[0],
      )
      return result.embeddings.map((e) => e.values)
    })

    allEmbeddings.push(...embeddings)
  }

  return allEmbeddings
}

/**
 * Split document text into overlapping chunks.
 * Target: ~500 tokens per chunk with sentence boundary detection.
 */
export function chunkText(text: string, chunkSize = 2000, overlap = 200): string[] {
  const cleaned = text
    .replace(/www\.[^\s]+\s+\d{4},\s*No\.\d+\s*-\d+-/g, ' ')
    .replace(/\f/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length <= chunkSize) return isGoodChunk(cleaned) ? [cleaned] : []

  const chunks: string[] = []
  let start = 0

  while (start < cleaned.length) {
    let end = start + chunkSize
    if (end < cleaned.length) {
      const boundary = cleaned.lastIndexOf('. ', end)
      if (boundary > start + chunkSize / 2) end = boundary + 1
    }
    const chunk = cleaned.slice(start, end).trim()
    if (isGoodChunk(chunk)) chunks.push(chunk)
    start = end - overlap
  }

  return chunks
}

function isGoodChunk(text: string): boolean {
  if (text.length < 100) return false
  const wordChars = (text.match(/[\p{L}]/gu) ?? []).length
  if (wordChars / text.length < 0.4) return false
  const words = (text.match(/[\p{L}]{3,}/gu) ?? []).length
  return words >= 10
}
