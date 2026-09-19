import type { UserRole, VerificationStatus } from '@/types/roles'

export const PROFILE_COOKIE = 'up'
export const PROFILE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60

export type ProfileCookie = {
  role: UserRole
  full_name: string | null
  email: string | null
  verification_status: VerificationStatus | null
}

export function serializeProfileCookie(profile: ProfileCookie): string {
  return JSON.stringify(profile)
}

export function parseProfileCookie(
  raw: string | null | undefined,
): ProfileCookie | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ProfileCookie>
    if (
      !parsed.role ||
      !['company', 'recycler', 'admin'].includes(parsed.role)
    ) {
      return null
    }
    return {
      role: parsed.role,
      full_name: typeof parsed.full_name === 'string' ? parsed.full_name : null,
      email: typeof parsed.email === 'string' ? parsed.email : null,
      verification_status:
        parsed.verification_status &&
        ['pending', 'verified', 'rejected'].includes(parsed.verification_status)
          ? parsed.verification_status
          : null,
    }
  } catch {
    return null
  }
}