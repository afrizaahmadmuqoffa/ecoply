import { z } from 'zod'
import {
  stripDigits,
  isValidNpwp,
  isValidNib,
  isValidNik,
} from '@/lib/utils/idnumbers'

export const certificationSchema = z.object({
  name: z.string().min(1, 'Nama sertifikasi wajib diisi'),
  file_url: z.string().url('URL file tidak valid'),
  uploaded_at: z.string(),
})

export const updateCompanyProfileSchema = z
  .object({
    name: z.string().min(2, 'Nama perusahaan minimal 2 karakter').max(200),
    segment: z.enum(['umkm', 'non_umkm']).optional(),
    industry: z.string().min(2, 'Jenis industri wajib diisi').max(100),
    npwp: z
      .string()
      .transform(stripDigits)
      .refine(
        (v) => v === '' || isValidNpwp(v),
        'Format NPWP tidak valid (15 atau 16 digit)',
      ),
    nib: z
      .string()
      .transform(stripDigits)
      .refine(
        (v) => v === '' || isValidNib(v),
        'NIB harus terdiri dari 13 digit angka',
      ),
    nik: z
      .string()
      .transform(stripDigits)
      .refine(
        (v) => v === '' || isValidNik(v),
        'NIK harus terdiri dari 16 digit angka',
      )
      .optional()
      .or(z.literal('')),
    location_lat: z.number().min(-90).max(90),
    location_lng: z.number().min(-180).max(180),
    address_text: z.string().min(1, 'Alamat wajib diisi — pilih lokasi di peta').max(1000),
    full_name: z.string().min(2, 'Nama lengkap minimal 2 karakter').max(100),
    certifications: z
      .array(certificationSchema)
      .max(10, 'Maksimal 10 sertifikasi')
      .default([]),
  })
  .superRefine((val, ctx) => {
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

export type Certification = z.infer<typeof certificationSchema>
export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileSchema>