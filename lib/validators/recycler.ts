import { z } from 'zod'
import { stripDigits, isValidNpwp, isValidNib } from '@/lib/utils/idnumbers'

export const certificationSchema = z.object({
  name: z.string().min(1, 'Nama sertifikasi wajib diisi'),
  file_url: z.string().url('URL file tidak valid'),
  uploaded_at: z.string(),
})

export const upsertRecyclerDetailsSchema = z.object({
  name: z.string().min(2, 'Nama fasilitas minimal 2 karakter').max(200),
  full_name: z.string().min(2, 'Nama lengkap minimal 2 karakter').max(100),
  npwp: z
    .string()
    .transform(stripDigits)
    .refine(isValidNpwp, 'Format NPWP tidak valid (15 atau 16 digit)'),
  nib: z
    .string()
    .transform(stripDigits)
    .refine(isValidNib, 'NIB harus terdiri dari 13 digit angka'),
  accepted_materials: z.array(z.string()).min(1, 'Pilih minimal 1 jenis material yang diterima'),
  capacity_per_month: z.number().positive('Kapasitas harus lebih dari 0'),
  capacity_unit: z.enum(['kg', 'ton']).default('kg'),
  location_lat: z.number().min(-90).max(90),
  location_lng: z.number().min(-180).max(180),
  address_text: z
    .string()
    .max(1000, 'Alamat terlalu panjang')
    .nullable(),
  service_radius_km: z.number().min(1, 'Radius minimal 1 km').max(1000, 'Radius maksimal 1000 km'),
  certifications: z.array(certificationSchema).max(10, 'Maksimal 10 sertifikasi').default([]),
  is_active: z.boolean().default(true),
})

export type Certification = z.infer<typeof certificationSchema>
export type UpsertRecyclerDetailsInput = z.infer<typeof upsertRecyclerDetailsSchema>