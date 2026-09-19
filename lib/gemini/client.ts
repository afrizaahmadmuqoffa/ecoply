/**
 * Gemini client helpers.
 * All calls go through withGeminiRetry() for automatic key rotation on 429
 * and retry on transient network errors / timeouts.
 */
export { withGeminiRetry, getGeminiClient, getGeminiKeyInfo } from './key-rotator'
export { GeminiTimeoutError } from './errors'
export { SchemaType } from '@google/generative-ai'
