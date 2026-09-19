import { GoogleGenerativeAI } from '@google/generative-ai'
import { GeminiTimeoutError, isRateLimitError, isTransientNetworkError } from './errors'

export { GeminiTimeoutError } from './errors'

/**
 * Gemini API Key Rotator
 *
 * Collects all GEMINI_API_KEY_1..N from env at startup.
 * On each call, uses keys round-robin.
 * On 429 (rate limit) or quota error, switches to next key immediately
 * and retries the same request — transparent to callers.
 *
 * Transient network failures ("fetch failed", ECONNRESET, DNS, etc.) and
 * timeouts are also retried with exponential backoff + jitter, so a
 * single dropped connection (mobile hotspot, flaky link) no longer
 * fails the request outright.
 */

// ── Load all keys ─────────────────────────────────────────

function loadKeys(): string[] {
  const keys: string[] = []

  // Try numbered keys first: GEMINI_API_KEY_1 ... GEMINI_API_KEY_10
  for (let i = 1; i <= 20; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`]
    if (key && key.trim() && !key.startsWith('your_key')) {
      keys.push(key.trim())
    }
  }

  // Fallback: single GEMINI_API_KEY (backward compat)
  if (keys.length === 0) {
    const single = process.env.GEMINI_API_KEY
    if (single && single.trim()) keys.push(single.trim())
  }

  if (keys.length === 0) {
    throw new Error('No Gemini API keys configured. Set GEMINI_API_KEY_1 in .env.local')
  }

  return keys
}

// ── Key Rotator class ─────────────────────────────────────

class GeminiKeyRotator {
  private keys: string[]
  private index = 0
  private clients: Map<string, GoogleGenerativeAI> = new Map()

  constructor() {
    this.keys = loadKeys()
    console.log(`[Gemini Rotator] Loaded ${this.keys.length} API key(s)`)
  }

  private getClient(key: string): GoogleGenerativeAI {
    if (!this.clients.has(key)) {
      this.clients.set(key, new GoogleGenerativeAI(key))
    }
    return this.clients.get(key)!
  }

  getCurrentClient(): GoogleGenerativeAI {
    return this.getClient(this.keys[this.index])
  }

  rotateKey(): boolean {
    const next = (this.index + 1) % this.keys.length
    if (next === this.index) return false // only one key, can't rotate
    console.log(`[Gemini Rotator] Rate limited on key ${this.index + 1}, switching to key ${next + 1}`)
    this.index = next
    return true
  }

  keyCount(): number {
    return this.keys.length
  }

  currentKeyIndex(): number {
    return this.index + 1
  }
}

// ── Singleton ─────────────────────────────────────────────
// Using module-level singleton so state persists across requests in same process.
// In serverless/edge, this resets per cold start — acceptable tradeoff.

let _rotator: GeminiKeyRotator | null = null

function getRotator(): GeminiKeyRotator {
  if (!_rotator) _rotator = new GeminiKeyRotator()
  return _rotator
}

// ── Exported helper: run with auto-retry ──────────────────

const MAX_RETRIES = 10 // max = number of keys

const DEFAULT_TIMEOUT_MS = 90_000

// Budgets for transient failures (kept small so a fully-down network
// fails fast instead of hanging for many minutes):
// - network errors: 3 re-tries (they fail quickly, so cheap)
// - timeouts:       1 re-try (each timeout can burn timeoutMs)
const NETWORK_RETRIES = 3
const TIMEOUT_RETRIES = 1

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () => reject(new GeminiTimeoutError(ms)))
    }),
  ]).finally(() => clearTimeout(timer))
}

// Exponential backoff (1s, 2s, 4s, ... capped at 8s) + jitter (0.6x–1.4x).
function backoffMs(retriedSoFar: number): number {
  const base = Math.min(1000 * 2 ** Math.max(0, retriedSoFar - 1), 8000)
  return Math.round(base * (0.6 + Math.random() * 0.8))
}

export async function withGeminiRetry<T>(
  fn: (genAI: GoogleGenerativeAI) => Promise<T>,
  opts?: { timeoutMs?: number },
): Promise<T> {
  const rotator = getRotator()
  let attempts = 0
  let networkRetriesLeft = NETWORK_RETRIES
  let timeoutRetriesLeft = TIMEOUT_RETRIES
  const maxAttempts = Math.min(MAX_RETRIES, rotator.keyCount())
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS

  while (attempts < maxAttempts) {
    try {
      if (timeoutMs > 0) {
        return await withTimeout(() => fn(rotator.getCurrentClient()), timeoutMs)
      }
      return await fn(rotator.getCurrentClient())
    } catch (err) {
      if (isRateLimitError(err)) {
        attempts++
        const rotated = rotator.rotateKey()
        if (!rotated) {
          // All keys exhausted — wait briefly then retry from start
          console.warn('[Gemini Rotator] All keys rate limited. Waiting 60s...')
          await sleep(60_000)
          attempts = 0
          continue
        }
        // Brief pause before retry with new key
        await sleep(500)
        continue
      }

      if (isTransientNetworkError(err)) {
        const isTimeout = err instanceof GeminiTimeoutError
        if (isTimeout) {
          if (timeoutRetriesLeft <= 0) throw err
          timeoutRetriesLeft--
        } else {
          if (networkRetriesLeft <= 0) throw err
          networkRetriesLeft--
        }
        const retriedSoFar =
          NETWORK_RETRIES - networkRetriesLeft + (TIMEOUT_RETRIES - timeoutRetriesLeft)
        const backoff = backoffMs(retriedSoFar)
        console.warn(
          `[Gemini Retry] Transient ${isTimeout ? 'timeout' : 'network'} error ` +
            `(${err instanceof Error ? err.message : String(err)}). Retrying in ${backoff}ms...`,
        )
        await sleep(backoff)
        continue
      }

      // Terminal error (bad request, malformed JSON, safety block, ...) — rethrow
      throw err
    }
  }

  throw new Error('[Gemini Rotator] All API keys exhausted after maximum retries')
}

// ── Convenience: get current GenAI client ─────────────────
export function getGeminiClient(): GoogleGenerativeAI {
  return getRotator().getCurrentClient()
}

export function getGeminiKeyInfo(): { current: number; total: number } {
  const r = getRotator()
  return { current: r.currentKeyIndex(), total: r.keyCount() }
}
