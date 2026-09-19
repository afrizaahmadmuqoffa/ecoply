import { z } from 'zod'
import { CATEGORIES, MATERIAL_OPTIONS } from '@/lib/constants/marketplace'

export const createListingSchema = z.object({
  material_type: z.string().min(1, 'Jenis material wajib dipilih'),
  category: z.enum(CATEGORIES as [string, ...string[]], {
    error: () => ({ message: 'Kategori tidak valid' }),
  }),
  weight: z.number().positive('Berat harus lebih dari 0'),
  unit: z.string().min(1, 'Unit wajib dipilih'),
  location_lat: z.number().min(-90).max(90),
  location_lng: z.number().min(-180).max(180),
  address_text: z.string().min(5, 'Alamat hasil geocoding terlalu pendek'),
  pickup_instructions: z.string().optional(),
  
  // Objective condition criteria
  is_sorted: z.boolean().default(false),
  is_cleaned: z.boolean().default(false),
  is_mixed: z.boolean().default(false),
  contaminant_note: z.string().optional(),
  photos: z.array(z.string()).default([]),
  pickup_schedule: z.string().optional(),
  free_for_pickup: z.boolean().default(false),
}).refine(
  (data) => {
    // Validasi: material_type harus valid untuk category yang dipilih
    const validMaterials = MATERIAL_OPTIONS[data.category] || []
    return validMaterials.includes(data.material_type)
  },
  {
    message: 'Jenis material tidak valid untuk kategori yang dipilih',
    path: ['material_type'],
  }
)
export const createBidSchema = z.object({
  listing_id: z.string().uuid(),
  price: z.number().nullable(),
  note: z.string().optional().nullable(),
})

export const updateListingStatusSchema = z.object({
  listing_id: z.string().uuid(),
  status: z.enum(['open', 'dealing', 'confirmed', 'cancelled', 'completed']),
})

export const createRequestPickupSchema = z.object({
  listing_id: z.string().uuid(),
  recycler_id: z.string().uuid(),
  price: z.number().nullable(),
  note: z.string().optional().nullable(),
})

export const confirmPickupSchema = z.object({
  listing_id: z.string().uuid(),
  scheduled_at: z.string().min(1, 'Jadwal pickup wajib diisi'),
  pickup_address: z.string().optional().nullable(),
  pickup_note: z.string().optional().nullable(),
})

export const recordPickupSchema = z.object({
  manifest_id: z.string().uuid(),
  net_weight_kg: z.number().positive('Berat bersih harus lebih dari 0'),
})

export const confirmFulfillmentSchema = z.object({
  manifest_id: z.string().uuid(),
})

export const issueCertificateSchema = z.object({
  manifest_id: z.string().uuid(),
})
