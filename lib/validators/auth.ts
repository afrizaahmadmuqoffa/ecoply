import { z } from 'zod'

export const signUpSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf kapital')
    .regex(/[0-9]/, 'Password harus mengandung angka'),
  fullName: z.string().min(2, 'Nama minimal 2 karakter').max(100),
})

export const selectRoleSchema = z.object({
  role: z.enum(['company', 'recycler'], {
    message: 'Pilih role yang valid',
  }),
})

export const signInSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export const companyOnboardingSchema = z
  .object({
    name: z.string().min(2, 'Nama perusahaan minimal 2 karakter').max(200),
    segment: z.enum(['umkm', 'non_umkm']).optional(),
    industry: z.string().min(2, 'Jenis industri wajib diisi').max(100),
    address: z.string().min(10, 'Alamat terlalu singkat').max(500).optional().or(z.literal('')),
    npwp: z
      .string()
      .refine(
        (v) =>
          v === '' || /^(?:\d{15}|\d{16})$/.test(v.replace(/\D/g, '')),
        'Format NPWP tidak valid (15 atau 16 digit)',
      ),
    nib: z
      .string()
      .refine(
        (v) => v === '' || /^\d{13}$/.test(v),
        'NIB harus terdiri dari 13 digit angka',
      ),
    nik: z
      .string()
      .regex(/^\d{16}$/, 'NIK harus terdiri dari 16 digit angka')
      .optional()
      .or(z.literal('')),
    // ✅ Ubah: koordinat wajib jika salah satu ada, address_text optional
    location_lat: z.number().min(-90).max(90).optional(),
    location_lng: z.number().min(-180).max(180).optional(),
    address_text: z.string().min(1, 'Alamat wajib diisi — klik pada peta').max(1000),
  })
  .superRefine((val, ctx) => {
    if (!val.segment) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['segment'],
        message: 'Pilih segmen usaha Anda',
      })
    }
    if (val.segment === 'umkm') {
      if (!val.nik?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nik'],
          message: 'NIK wajib diisi untuk UMKM',
        })
      }
      return
    }
    if (!val.npwp?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['npwp'],
        message: 'NPWP wajib diisi untuk segmen ini',
      })
    }
    if (!val.nib?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nib'],
        message: 'NIB wajib diisi untuk segmen ini',
      })
    }
  })

export const recyclerOnboardingSchema = z.object({
  name: z.string().min(2, 'Nama fasilitas minimal 2 karakter').max(200),
  address: z.string().min(10, 'Alamat terlalu singkat').max(500).optional().or(z.literal('')),
  npwp: z
    .string()
    .refine(
      (v) => /^(?:\d{15}|\d{16})$/.test(v.replace(/\D/g, '')),
      'Format NPWP tidak valid (15 atau 16 digit)',
    ),
  nib: z.string().regex(/^\d{13}$/, 'NIB harus terdiri dari 13 digit angka'),
  capacityKgPerMonth: z.coerce
    .number()
    .positive('Kapasitas harus positif')
    .optional(),
  // ✅ Ubah: koordinat wajib jika salah satu ada, address_text optional
  location_lat: z.number().min(-90).max(90).optional(),
  location_lng: z.number().min(-180).max(180).optional(),
  address_text: z.string().max(1000).optional().nullable(),
  service_radius_km: z.number().min(1).max(1000).optional(),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SelectRoleInput = z.infer<typeof selectRoleSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type CompanyOnboardingInput = z.infer<typeof companyOnboardingSchema>
export type RecyclerOnboardingInput = z.infer<typeof recyclerOnboardingSchema>
