export type IdNumberKind = 'nik' | 'npwp' | 'nib'

export const NIK_LENGTH = 16
export const NIB_LENGTH = 13
export const NPWP_LENGTHS = [15, 16] as const

export const NIK_RE = /^\d{16}$/
export const NIB_RE = /^\d{13}$/
export const NPWP_RE = /^(?:\d{15}|\d{16})$/

export function stripDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

export function isValidNik(value: string): boolean {
  return NIK_RE.test(stripDigits(value))
}

export function isValidNib(value: string): boolean {
  return NIB_RE.test(stripDigits(value))
}

export function isValidNpwp(value: string): boolean {
  return NPWP_RE.test(stripDigits(value))
}

/**
 * Format NPWP progresif saat mengetik.
 * - 15 digit (format lama): 12.345.678.9-012.345
 * - 16 digit (format baru, berbasis NIK): 1234 5678 9012 3456
 */
export function formatNpwp(raw: string): string {
  const d = stripDigits(raw)
  if (d.length >= 16) {
    return d.slice(0, 16).replace(/\B(?=(\d{4})+(?!\d))/g, ' ')
  }
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8), d.slice(8, 9), d.slice(9, 12), d.slice(12, 15)]
  let out = parts[0]
  if (parts[1]) out += `.${parts[1]}`
  if (parts[2]) out += `.${parts[2]}`
  if (parts[3]) out += `.${parts[3]}`
  if (parts[4]) out += `-${parts[4]}`
  if (parts[5]) out += `.${parts[5]}`
  return out
}

/** NIK: 16 digit, dikelompokkan tiap 4 angka. */
export function formatNik(raw: string): string {
  return stripDigits(raw).slice(0, NIK_LENGTH).replace(/\B(?=(\d{4})+(?!\d))/g, ' ')
}

/** NIB: 13 digit, ditampilkan polos (sesuai dokumen OSS). */
export function formatNib(raw: string): string {
  return stripDigits(raw).slice(0, NIB_LENGTH)
}

type IdNumberSpec = {
  label: string
  maxLength: number
  validLengths: readonly number[]
  example: string
  note: string
  source: string
  format: (raw: string) => string
  isValid: (raw: string) => boolean
}

export const ID_NUMBER_SPEC: Record<IdNumberKind, IdNumberSpec> = {
  nik: {
    label: 'NIK',
    maxLength: NIK_LENGTH,
    validLengths: [NIK_LENGTH],
    example: 'Contoh: 3173 0124 5678 9012',
    note: 'Nomor 16 digit di kartu tanda penduduk.',
    source: 'Terdapat di kartu KTP Anda (16 digit).',
    format: formatNik,
    isValid: isValidNik,
  },
  npwp: {
    label: 'NPWP',
    maxLength: 16,
    validLengths: NPWP_LENGTHS,
    example: 'Contoh: 01.234.567.8-901.234',
    note: 'Format lama 15 digit atau format baru 16 digit.',
    source:
      'Terdapat di kartu NPWP atau bisa dicek di djponline.pajak.go.id.',
    format: formatNpwp,
    isValid: isValidNpwp,
  },
  nib: {
    label: 'NIB',
    maxLength: NIB_LENGTH,
    validLengths: [NIB_LENGTH],
    example: 'Contoh: 9120000321321',
    note: 'Nomor Induk Berusaha (OSS) — 13 digit angka.',
    source: 'Terdapat di dokumen izin berusaha dari OSS (oss.go.id).',
    format: formatNib,
    isValid: isValidNib,
  },
}

export function messagesFor(kind: IdNumberKind, digits: string) {
  const spec = ID_NUMBER_SPEC[kind]
  if (digits.length === 0) {
    return { tone: 'neutral' as const, text: spec.example, counter: `${digits.length}/${spec.maxLength}` }
  }
  if (spec.isValid(digits)) {
    return { tone: 'success' as const, text: `Format ${spec.label} benar`, counter: `${digits.length}/${spec.maxLength}` }
  }
  const remaining = spec.maxLength - digits.length
  return {
    tone: 'warning' as const,
    text:
      remaining > 0
        ? `Tinggal ${remaining} digit lagi (panjang ${spec.validLengths.join(' atau ')} digit)`
        : `Panjang ${spec.label} harus ${spec.validLengths.join(' atau ')} digit`,
    counter: `${digits.length}/${spec.maxLength}`,
  }
}