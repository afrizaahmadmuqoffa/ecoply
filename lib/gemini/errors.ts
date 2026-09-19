/**
 * Gemini error classification + user-friendly messages.
 *
 * Raw SDK errors can surface as network failures ("fetch failed"),
 * rate limits, timeouts, or malformed responses. These helpers let
 * callers distinguish transient errors (safe to retry) from terminal
 * ones, and translate raw errors into friendly Indonesian messages
 * suitable for the UI / audit_jobs.error_message.
 */

export class GeminiTimeoutError extends Error {
  constructor(ms: number) {
    super(`Gemini call timed out after ${ms}ms`)
    this.name = 'GeminiTimeoutError'
  }
}

const RATE_LIMIT_PATTERN = /quota|rate limit|resource_exhausted|too many requests|service unavailable|high demand|503|429/i

const NETWORK_ERROR_PATTERN =
  /fetch failed|econnreset|econnrefused|enotfound|etimedout|eai_again|ehosunreach|enetunreach|epipe|socket hang up|und_err_|getaddrinfo|network|connection|dns/i

const INVALID_RESPONSE_PATTERN =
  /unexpected token|syntax|json|parse|expecting|invalid response|response contain|not a valid/i

export function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { status?: number; message?: string; code?: number }
  if (e.status === 429 || e.status === 503) return true
  if (e.code === 429 || e.code === 503) return true
  const msg = (e.message ?? '').toLowerCase()
  return RATE_LIMIT_PATTERN.test(msg)
}

export function isTransientNetworkError(err: unknown): boolean {
  if (err instanceof GeminiTimeoutError) return true
  if (!err || typeof err !== 'object') return false
  const e = err as { status?: number; code?: number; message?: string }
  if (typeof e.status === 'number' && e.status >= 400 && e.status < 500) return false
  if (typeof e.code === 'number' && e.code >= 400 && e.code < 500) return false
  const msg = (e.message ?? String(err)).toLowerCase()
  return NETWORK_ERROR_PATTERN.test(msg)
}

export function friendlyGeminiError(
  err: unknown,
  opts?: { fallback?: string },
): string {
  if (err instanceof GeminiTimeoutError) {
    return 'Waktu pemrosesan AI habis. Coba lagi, atau periksa koneksi internet Anda.'
  }

  const message = err instanceof Error ? err.message : String(err)

  if (isRateLimitError(err) || /all api keys exhausted/i.test(message)) {
    return 'Layanan AI sedang sibuk. Tunggu beberapa saat, lalu coba lagi.'
  }

  if (isTransientNetworkError(err)) {
    return 'Koneksi ke layanan AI tidak stabil. Periksa koneksi internet Anda, lalu coba lagi.'
  }

  if (INVALID_RESPONSE_PATTERN.test(message)) {
    return 'AI tidak memberikan respons yang valid. Coba dokumen atau teks yang berbeda.'
  }

  return opts?.fallback ?? 'Terjadi kesalahan pada layanan AI. Silakan coba lagi.'
}