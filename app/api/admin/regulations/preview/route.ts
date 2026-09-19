import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractTextFromBuffer } from '@/lib/gemini/extract-text'
import { chunkText } from '@/lib/gemini/embedding'
import { checkRateLimit } from '@/lib/rate-limit'

export type PreviewChunk = {
  index: number
  text: string
  tokenEstimate: number
  quality: 'good' | 'warn' | 'bad'
  qualityReason?: string
}

export type PreviewResponse = {
  regulationId: string
  fileName: string
  totalChunks: number
  filteredOut: number
  rawTextLength: number
  chunks: PreviewChunk[]
}

function assessChunkQuality(text: string): { quality: PreviewChunk['quality']; reason?: string } {
  const wordChars = (text.match(/[\p{L}]/gu) ?? []).length
  const ratio = wordChars / text.length
  const words = (text.match(/[\p{L}]{3,}/gu) ?? []).length

  if (ratio < 0.4 || words < 10) {
    return { quality: 'bad', reason: 'Terlalu banyak noise / OCR error' }
  }
  if (ratio < 0.55 || words < 20) {
    return { quality: 'warn', reason: 'Kualitas sedang — ada kemungkinan noise' }
  }
  return { quality: 'good' }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rl = await checkRateLimit(`admin:regulations-preview:${user.id}`, 10, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan. Tunggu beberapa saat.' }, { status: 429 })
  }

  const { regulationId } = await request.json() as { regulationId?: string }
  if (!regulationId) return NextResponse.json({ error: 'regulationId required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: regulation } = await admin
    .from('regulations')
    .select('id, title, file_path, file_name')
    .eq('id', regulationId)
    .single()

  if (!regulation?.file_path) {
    return NextResponse.json({ error: 'Regulation has no file attached' }, { status: 400 })
  }

  const { data: fileData, error: downloadError } = await admin.storage
    .from('regulation-docs')
    .download(regulation.file_path)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: `Download failed: ${downloadError?.message}` }, { status: 500 })
  }

  const buffer = await fileData.arrayBuffer()
  const rawText = await extractTextFromBuffer(buffer, regulation.file_name ?? 'file.pdf')

  if (!rawText || rawText.trim().length < 50) {
    return NextResponse.json({ error: 'Could not extract text from document' }, { status: 422 })
  }

  // Get ALL chunks before quality filter so we can show filtered-out count
  const allChunksRaw = chunkTextRaw(rawText)
  const goodChunks = chunkText(rawText)

  const filteredOut = allChunksRaw.length - goodChunks.length

  const chunks: PreviewChunk[] = goodChunks.map((text, index) => {
    const { quality, reason } = assessChunkQuality(text)
    return {
      index,
      text,
      tokenEstimate: Math.ceil(text.length / 4),
      quality,
      qualityReason: reason,
    }
  })

  const response: PreviewResponse = {
    regulationId,
    fileName: regulation.file_name ?? '',
    totalChunks: chunks.length,
    filteredOut,
    rawTextLength: rawText.length,
    chunks,
  }

  return NextResponse.json(response)
}

// Raw chunking without quality filter — for counting purposes
function chunkTextRaw(text: string): string[] {
  const cleaned = text
    .replace(/www\.[^\s]+\s+\d{4},\s*No\.\d+\s*-\d+-/g, ' ')
    .replace(/\f/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length <= 2000) return cleaned.length > 50 ? [cleaned] : []

  const chunks: string[] = []
  let start = 0

  while (start < cleaned.length) {
    let end = start + 2000
    if (end < cleaned.length) {
      const boundary = cleaned.lastIndexOf('. ', end)
      if (boundary > start + 1000) end = boundary + 1
    }
    const chunk = cleaned.slice(start, end).trim()
    if (chunk.length > 50) chunks.push(chunk)
    start = end - 200
  }

  return chunks
}
