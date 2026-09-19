/**
 * Regenerate lib/compliance/area-embeddings.ts.
 *
 * Precomputes the 768-dim embeddings of the 12 static compliance area
 * queries (lib/compliance/areas.ts) using the configured Gemini embedding
 * model/mode, writing them as hardcoded constants so runtime audits never
 * call the embedding API and retrieval stays fully deterministic.
 *
 * Re-run ONLY when the area queries or the embedding model change:
 *
 *   node scripts/precompute-area-embeddings.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { GoogleGenerativeAI } from '@google/generative-ai'

const OUT = new URL('../lib/compliance/area-embeddings.ts', import.meta.url)

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const API_KEY = env.GEMINI_API_KEY_1 || env.GEMINI_API_KEY
if (!API_KEY) throw new Error('No GEMINI_API_KEY_1 found in .env.local')
const EMBED_MODEL = env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001'

// Extract the 12 `query` strings from areas.ts (order = AUDIT_AREAS order).
const areasSource = readFileSync(
  new URL('../lib/compliance/areas.ts', import.meta.url),
  'utf8',
)
const queries = [...areasSource.matchAll(/query:\s*"([^"]+)"/g)].map(
  (m) => m[1],
)
if (queries.length !== 12) {
  throw new Error(`Expected 12 area queries, got ${queries.length}`)
}

const genAI = new GoogleGenerativeAI(API_KEY)
const model = genAI.getGenerativeModel({ model: EMBED_MODEL })
const result = await model.batchEmbedContents({
  requests: queries.map((text) => ({
    content: { role: 'user', parts: [{ text }] },
    outputDimensionality: 768,
  })),
})

const body = result.embeddings
  .map(
    (e, i) =>
      `  // area ${i + 1}\n  [${e.values.map((v) => Number(v.toFixed(6))).join(', ')}],`,
  )
  .join('\n')

const header = [
  '/**',
  ' * Precomputed 768-dim embeddings (gemini-embedding-001) for the 12 static',
  ' * compliance area queries (lib/compliance/areas.ts -> a.query).',
  ' *',
  ' * Hardcoding keeps regulation retrieval fully deterministic and removes the',
  ' * per-audit Gemini embedding call (zero tokens, zero drift). Regenerate with',
  ' * scripts/precompute-area-embeddings.mjs if the queries or the embedding',
  ' * model ever change.',
  ' */',
  '',
].join('\n')

writeFileSync(
  OUT,
  header + 'export const AREA_QUERY_EMBEDDINGS: number[][] = [\n' + body + '\n]\n',
  'utf8',
)
console.log('Regenerated', queries.length, 'area embeddings ->', OUT.pathname)