export function uniqueViolationMessage(
  error: { code?: string; message?: string } | null,
): string | null {
  if (!error || error.code !== '23505') return null
  const m = error.message ?? ''
  if (/npwp/i.test(m)) return 'NPWP sudah terdaftar akun lain.'
  if (/nik/i.test(m)) return 'NIK sudah terdaftar akun lain.'
  if (/nib/i.test(m)) return 'NIB sudah terdaftar akun lain.'
  return 'NPWP/NIK sudah terdaftar akun lain.'
}