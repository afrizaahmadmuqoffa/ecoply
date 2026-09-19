import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractTextFromBuffer } from '@/lib/gemini/extract-text'
import { chunkText, batchEmbedTexts } from '@/lib/gemini/embedding'
import { friendlyGeminiError } from '@/lib/gemini/errors'
import { checkRateLimit } from '@/lib/rate-limit'
import { recordOpsEvent } from '@/lib/ops/events'

/**
 * POST /api/admin/regulations/embed
 * Body: { regulationId: string }
 *
 * Pipeline:
 * 1. Fetch regulation metadata + file path from DB
 * 2. Download file from Supabase Storage
 * 3. Extract text
 * 4. Chunk text
 * 5. Batch embed with gemini-embedding-001
 * 6. Upsert chunks into regulation_chunks
 */
export async function POST(request: NextRequest) {
  // Auth guard
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rl = await checkRateLimit(`gemini:regulations-embed:${user.id}`, 5, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan. Tunggu beberapa saat.' },
      { status: 429 },
    )
  }

  const body = await request.json() as { regulationId?: string; chunks?: Array<{ index: number; text: string }> }
  const { regulationId, chunks: previewedChunks } = body

  if (!regulationId) {
    return NextResponse.json({ error: 'regulationId is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Fetch regulation
  const { data: regulation, error: regError } = await admin
    .from('regulations')
    .select('id, title, file_path, file_name')
    .eq('id', regulationId)
    .single()

  if (regError || !regulation) {
    return NextResponse.json({ error: 'Regulation not found' }, { status: 404 })
  }

  if (!regulation.file_path) {
    return NextResponse.json(
      { error: 'Regulation has no file attached. Upload a document first.' },
      { status: 400 },
    )
  }

  try {
    // If chunks already previewed+edited by admin, skip file download
    let chunks: string[]

    if (previewedChunks && previewedChunks.length > 0) {
      chunks = previewedChunks.map((c) => c.text.trim()).filter((t) => t.length > 0)
    } else {
      // Download and extract from file
      const { data: fileData, error: downloadError } = await admin.storage
        .from('regulation-docs')
        .download(regulation.file_path)

      if (downloadError || !fileData) {
        return NextResponse.json(
          { error: `Failed to download file: ${downloadError?.message}` },
          { status: 500 },
        )
      }

      const buffer = await fileData.arrayBuffer()
      const text = await extractTextFromBuffer(buffer, regulation.file_name ?? 'file.pdf')

      if (!text || text.trim().length < 100) {
        return NextResponse.json(
          { error: 'Could not extract meaningful text from document.' },
          { status: 422 },
        )
      }

      chunks = chunkText(text)
    }

    // 5. Batch embed (Gemini allows up to 100 per batch)
    const BATCH_SIZE = 50
    const allEmbeddings: number[][] = []

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const embeddings = await batchEmbedTexts(batch)
      allEmbeddings.push(...embeddings)
    }

    // 6. Delete old chunks for this regulation, then insert new ones
    await admin
      .from('regulation_chunks')
      .delete()
      .eq('regulation_id', regulationId)

    const rows = chunks.map((text_chunk, idx) => ({
      regulation_id: regulationId,
      chunk_index: idx,
      text_chunk,
      embedding: allEmbeddings[idx] ?? null,
      token_count: Math.ceil(text_chunk.length / 4),
    }))

    // Insert in batches of 50
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map(row => ({
        ...row,
        embedding: JSON.stringify(row.embedding),
      }))
      const { error: insertError } = await admin
        .from('regulation_chunks')
        .insert(batch)

      if (insertError) {
        return NextResponse.json(
          { error: `Failed to insert chunks: ${insertError.message}` },
          { status: 500 },
        )
      }
    }

    // 7. Mark regulation as embedded
    await admin
      .from('regulations')
      .update({
        is_embedded: true,
        embedded_at: new Date().toISOString(),
        chunk_count: chunks.length,
      })
      .eq('id', regulationId)

    return NextResponse.json({
      success: true,
      chunks: chunks.length,
      regulationId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await recordOpsEvent({
      kind: 'gemini',
      level: 'error',
      message,
      source: 'api/admin/regulations/embed',
      metadata: { userId: user.id },
    })
    return NextResponse.json(
      { error: friendlyGeminiError(err, { fallback: message }) },
      { status: 500 },
    )
  }
}
